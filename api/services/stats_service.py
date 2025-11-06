import json
import os


def main():
    """
    Invokes the methods from this service and generates a dict including the stats
    
    :return:
    
    """
    stats = retrieve_data()
    return stats


def retrieve_data():
    with open(os.getcwd() + "/repo/stats.json", "r", encoding='utf8') as f:
    # with open(os.getcwd() + "/repo/json_test.json", "r", encoding='utf8') as f:
        fileData = json.load(f)
        f.close()
    return fileData

