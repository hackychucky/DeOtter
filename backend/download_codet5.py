# backend/download_codet5.py
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import os

MODEL_NAME = "Salesforce/codet5-small"  # o "Salesforce/codet5-base"
OUT_DIR = "/Users/antonio/models/codet5-small"  # <--- YOUR FOLDER AND DESIRED FILENAME HERE

os.makedirs(OUT_DIR, exist_ok=True)

print("Downloading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.save_pretrained(OUT_DIR)

print("Downloading model (this may take a while)...")
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
model.save_pretrained(OUT_DIR)

print("Saved CodeT5 to", OUT_DIR)
