import json
import os
from typing import Any

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def file_path(name: str) -> str:
    return os.path.join(DATA_DIR, f"{name}.json")

def read_data(name: str) -> list:
    p = file_path(name)
    if not os.path.exists(p):
        return []
    with open(p, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if not content:
            return []
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return []

def write_data(name: str, data: Any):
    p = file_path(name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
