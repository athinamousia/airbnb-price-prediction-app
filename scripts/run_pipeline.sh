
#!/usr/bin/env bash
# Runs preprocessing, modeling (on the preprocessing output), then SHAP on the final model.
# Usage: ./scripts/run_pipeline.sh [N_TRIALS=50] [DATA_PATH]
set -euo pipefail

cd "$(dirname "$0")/.."

N_TRIALS="${1:-50}"
DATA_PATH="${2:-data/listings.csv}"
PROCESSED_DIR="output/processed"
SHAP_DIR="output/shap"

if [ -x ".venv/Scripts/python.exe" ]; then
  PYTHON=".venv/Scripts/python.exe"
elif [ -x ".venv/bin/python" ]; then
  PYTHON=".venv/bin/python"
else
  PYTHON="python"
fi

export PYTHONIOENCODING=utf-8

echo "==> Step 1/3: preprocessing ($DATA_PATH)"
"$PYTHON" -c "import sys; from backend.modeling.preprocessing import main; sys.argv=['preprocessing','--data-path','$DATA_PATH','--output-dir','$PROCESSED_DIR']; main()"

echo "==> Step 2/3: modeling (n_trials=$N_TRIALS)"
# Imported (not run with -m) so pickled classes keep their module path.
"$PYTHON" -c "import sys; from backend.modeling.modeling import main; sys.argv=['modeling','--preprocessed-dir','$PROCESSED_DIR','--n-trials','$N_TRIALS']; main()"

echo "==> Step 3/3: SHAP on the final model (sample of rows)"
"$PYTHON" -c "import sys; from backend.modeling.shap import main; sys.argv=['shap','--processed-dir','$PROCESSED_DIR','--output-dir','$SHAP_DIR']; main()"

echo "==> Pipeline finished"
+