"""Translate Greek Airbnb reviews to English with a local Ollama model.

Reads every data/reviews*.csv, translates the `comments` of reviews written in
Greek and saves the result to output/reviews/. Reviews that are not Greek
are left untouched. Translations are cached on disk, so the script can be
stopped and restarted without losing progress.

Requires Ollama running locally with the model pulled, e.g.:
    ollama pull gemma3:4b
"""

import argparse
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

import pandas as pd
from tqdm import tqdm

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = PROJECT_ROOT / "output" / "reviews"

OLLAMA_URL = "http://localhost:11434/api/chat"
DEFAULT_MODEL = "gemma3:4b"

SYSTEM_PROMPT = (
    "You are a professional translator. Translate the Airbnb guest review "
    "from Greek to English. Keep the meaning, tone and any <br/> tags. Parts "
    "that are already in English must stay unchanged. Reply with the "
    "translation only, without notes or quotation marks."
)

GREEK_CHARS = re.compile(r"[\u0370-\u03FF\u1F00-\u1FFF]")
LETTERS = re.compile(r"[^\W\d_]")
HTML_TAGS = re.compile(r"<[^>]+>")


def greek_ratio(text: str) -> float:
    letters = LETTERS.findall(HTML_TAGS.sub(" ", text))
    if not letters:
        return 0.0
    return len(GREEK_CHARS.findall(text)) / len(letters)


def translate_text(text: str, model: str, timeout: int, threads: int) -> str:
    payload = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        "options": {
            "temperature": 0,
            "num_predict": min(2048, max(128, len(text))),
            "num_thread": threads,
        },
    }
    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = json.load(response)
    return body["message"]["content"].strip()


def load_cache(path: Path) -> dict:
    cache = {}
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    # A freeze or power loss can leave a half-written last line.
                    continue
                cache[item["source"]] = item["translation"]
    return cache


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate Greek reviews to English")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL)
    parser.add_argument("--input-dir", type=str, default=str(DATA_DIR))
    parser.add_argument("--output-dir", type=str, default=str(OUTPUT_DIR))
    parser.add_argument(
        "--min-greek-ratio",
        type=float,
        default=0.2,
        help="Share of Greek letters above which a review counts as Greek",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Translate at most this many new reviews (useful for a quick test)",
    )
    parser.add_argument("--timeout", type=int, default=300, help="Seconds per review")
    parser.add_argument(
        "--threads",
        type=int,
        default=max(1, (os.cpu_count() or 4) // 2 - 1),
        help="CPU threads Ollama may use (kept below the core count so the laptop stays responsive)",
    )
    parser.add_argument(
        "--max-consecutive-failures",
        type=int,
        default=5,
        help="Exit (so the wrapper can restart Ollama) after this many failures in a row",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(Path(args.input_dir).glob("reviews*.csv"))
    if not files:
        raise SystemExit(f"No reviews*.csv files found in {args.input_dir}")

    cache_path = output_dir / "translation_cache.jsonl"
    cache = load_cache(cache_path)
    remaining = args.limit

    for path in files:
        df = pd.read_csv(path)
        comments = df["comments"].astype("string")
        ratios = comments.fillna("").map(greek_ratio)
        # Pre-filter: only reviews that contain Greek are ever sent to the model.
        # English (or empty) reviews are skipped and kept as they are.
        is_greek = (ratios > 0) & (ratios >= args.min_greek_ratio)
        pending = [t for t in comments[is_greek].unique() if t not in cache]
        if remaining is not None:
            pending = pending[: max(remaining, 0)]

        print(
            f"{path.name}: {int(is_greek.sum())} Greek reviews, "
            f"{len(pending)} to translate, "
            f"{int((~is_greek).sum())} non-Greek reviews skipped"
        )
        failed = 0
        consecutive_failures = 0
        with open(cache_path, "a", encoding="utf-8") as cache_file:
            for text in tqdm(pending, desc=path.name, unit="review"):
                try:
                    translation = translate_text(
                        text, args.model, args.timeout, args.threads
                    )
                except (urllib.error.HTTPError, TimeoutError):
                    # Ollama errored or hung on this review: skip it, retry on the next run.
                    translation = ""
                except urllib.error.URLError as error:
                    raise SystemExit(
                        f"Cannot reach Ollama at {OLLAMA_URL} ({error}). "
                        f"Start Ollama and run: ollama pull {args.model}"
                    )
                # An empty or still-Greek answer means the translation failed.
                if not translation or greek_ratio(translation) >= 0.5:
                    failed += 1
                    consecutive_failures += 1
                    if consecutive_failures >= args.max_consecutive_failures:
                        raise SystemExit(
                            f"{consecutive_failures} translations failed in a row; stopping."
                        )
                    continue
                consecutive_failures = 0
                cache[text] = translation
                cache_file.write(
                    json.dumps({"source": text, "translation": translation}, ensure_ascii=False)
                    + "\n"
                )
                cache_file.flush()
                os.fsync(cache_file.fileno())
        if remaining is not None:
            remaining -= len(pending)

        translated = comments.map(cache).where(is_greek)
        has_translation = translated.notna()
        df["comments"] = translated.where(has_translation, comments)
        df["translated"] = has_translation.astype(bool)
        df.to_csv(output_dir / path.name, index=False, encoding="utf-8")
        print(
            f"{path.name}: {int(has_translation.sum())}/{int(is_greek.sum())} "
            f"Greek reviews translated, {failed} failed -> {output_dir / path.name}"
        )


if __name__ == "__main__":
    main()
