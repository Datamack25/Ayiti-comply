"""Dossier Haïti — version Streamlit.

Affiche la plateforme HTML (index.html) dans Streamlit.
Les CSV du dossier data/ restent la source des données : modifiez-les,
poussez sur GitHub, et l'application se met à jour.
"""
import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).parent

st.set_page_config(page_title="Dossier Haïti", page_icon="🇭🇹", layout="wide")

# Supprime les marges de Streamlit pour laisser toute la place au dossier
st.markdown(
    """
    <style>
      #MainMenu, header, footer {visibility: hidden;}
      .block-container {padding: 0 !important; max-width: 100% !important;}
    </style>
    """,
    unsafe_allow_html=True,
)


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


@st.cache_data
def build_page() -> str:
    html = read("index.html")

    # 1. Feuille de style en ligne
    html = html.replace(
        '<link rel="stylesheet" href="assets/style.css">',
        "<style>" + read("assets/style.css") + "</style>",
    )

    # 2. Toutes les données CSV injectées dans la page
    csv_data = {p.stem: p.read_text(encoding="utf-8") for p in sorted((ROOT / "data").glob("*.csv"))}
    data_script = "<script>window.__CSV_DATA = " + json.dumps(csv_data, ensure_ascii=False) + ";</script>"

    # 3. Scripts en ligne (PapaParse, pdfmake, application)
    for src in [
        "assets/vendor/papaparse.min.js",
        "assets/vendor/pdfmake.min.js",
        "assets/vendor/vfs_fonts.js",
        "assets/app.js",
    ]:
        tag = '<script src="' + src + '"></script>'
        code = read(src).replace("</script", "<\\/script")
        prefix = data_script if src.endswith("papaparse.min.js") else ""
        html = html.replace(tag, prefix + "<script>" + code + "</script>")

    return html


components.html(build_page(), height=1000, scrolling=True)
