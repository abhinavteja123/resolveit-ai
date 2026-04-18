"""Document parser — extracts raw text from PDF, DOCX, and TXT files."""

import fitz  # PyMuPDF
from docx import Document


def parse_txt(filepath: str) -> str:
    """Parse a plain-text file."""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def parse_pdf(filepath: str) -> str:
    """Parse a PDF file using PyMuPDF (fitz)."""
    text_parts: list[str] = []
    with fitz.open(filepath) as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts)


def parse_docx(filepath: str) -> str:
    """Parse a DOCX file using python-docx."""
    doc = Document(filepath)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def parse_file(filepath: str, file_type: str) -> str:
    """Dispatch to the correct parser based on file type.

    Args:
        filepath: Path to the file on disk.
        file_type: One of 'pdf', 'docx', 'txt'.

    Returns:
        Extracted raw text.
    """
    file_type = file_type.lower().strip(".")
    if file_type == "pdf":
        return parse_pdf(filepath)
    elif file_type == "docx":
        return parse_docx(filepath)
    elif file_type == "txt":
        return parse_txt(filepath)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
