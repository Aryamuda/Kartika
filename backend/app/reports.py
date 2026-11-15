"""Minimal, escaped investigation exports from one evidence and simulation snapshot."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import escape

from .models import CompareResult


def _markdown(value: object) -> str:
    text = str(value).replace("\\", "\\\\").replace("\r", " ").replace("\n", " ")
    for symbol in ("`", "*", "_", "[", "]", "(", ")", "#", "!", "|"):
        text = text.replace(symbol, "\\" + symbol)
    return escape(text, quote=False)


def _table(headers: list[str], rows: list[list[str]]) -> tuple[str, str]:
    markdown = "| " + " | ".join(headers) + " |\n"
    markdown += "| " + " | ".join("---" for _ in headers) + " |\n"
    markdown += "\n".join("| " + " | ".join(_markdown(cell) for cell in row) + " |" for row in rows)
    html = "<table><thead><tr>" + "".join(f"<th>{escape(header)}</th>" for header in headers)
    html += "</tr></thead><tbody>" + "".join(
        "<tr>" + "".join(f"<td>{escape(cell)}</td>" for cell in row) + "</tr>" for row in rows
    ) + "</tbody></table>"
    return markdown, html


def build_report(incident: dict, comparison: CompareResult, events: list[dict]) -> dict[str, str]:
    title = f"Laporan investigasi COIP / {incident['id']}"
    summary = (
        f"Aset awal: {incident['primary_asset'] or 'belum dipetakan'}. "
        f"{len(incident['event_ids'])} peristiwa terkait pada {len(incident['affected_assets'])} aset. "
        f"Skor risiko heuristik: {incident['risk_score']}/100."
    )
    order = {event_id: index for index, event_id in enumerate(incident["event_ids"])}
    timeline_rows = []
    for event in sorted(events, key=lambda item: order[item["id"]]):
        time = datetime.fromisoformat(event["ts"].replace("Z", "+00:00")).astimezone(timezone(timedelta(hours=7)))
        timeline_rows.append([
            time.strftime("%d-%m-%Y %H:%M:%S WIB"), event["id"], event["source"],
            event["title"], event["provenance"]["raw_sha256"],
        ])
    timeline_md, timeline_html = _table(["Waktu", "ID bukti", "Sumber", "Deteksi asli", "SHA-256 JSON kanonis"], timeline_rows)
    statuses = {"available": "tersedia", "degraded": "terganggu", "down": "tidak tersedia"}
    scenario_rows = []
    for result in comparison.results:
        impact = "; ".join(f"{service.name}: {statuses[service.after]}" for service in result.service_availability)
        scenario_rows.append([
            result.scenario_name,
            f"{result.security_impact['malicious_blocked']}/{result.security_impact['malicious_total']}",
            ", ".join(result.reachability["compromised_reach_after"]) or "Tidak ada",
            impact, f"{result.scores['containment']:.1%}", f"{result.scores['availability']:.1%}",
            f"Didominasi {comparison.dominated[result.scenario_name]}" if result.scenario_name in comparison.dominated else "Tidak didominasi",
        ])
    scenarios_md, scenarios_html = _table(
        ["Skenario", "Alur berbahaya diblokir", "Sisa jangkauan", "Dampak layanan", "Pembatasan", "Ketersediaan", "Pertimbangan"], scenario_rows
    )
    limitations = [
        "Simulasi memodelkan kebijakan firewall dan dependensi layanan yang dideklarasikan; tanpa validasi tingkat paket.",
        "Skor bersifat indikatif. Hasil tidak memprediksi serangan dan bukan rekomendasi operasional otomatis.",
        "Aplikasi tidak mengeksekusi perubahan firewall. Data skenario demonstrasi bersifat sintetis.",
        "Hash JSON kanonis mendukung pemeriksaan konsistensi, bukan pembuktian keaslian sumber.",
    ]
    limitations.extend(dict.fromkeys(result.limitations for result in comparison.results))
    methods = list(dict.fromkeys(result.scores["method"] for result in comparison.results))
    markdown = (
        f"# {_markdown(title)}\n\n## Ringkasan insiden\n\n{_markdown(summary)}\n\n"
        f"Judul asli: {_markdown(incident['title'])}\n\nRingkasan sumber: {_markdown(incident['summary'])}\n\n"
        f"## Linimasa bukti\n\n{timeline_md}\n\n## Perbandingan skenario\n\n{scenarios_md}\n\n"
        "## Batasan model\n\n" + "\n".join(f"- {_markdown(item)}" for item in limitations)
        + "\n\n### Metode dari simulator\n\n" + "\n\n".join(_markdown(method) for method in methods) + "\n"
    )
    content = (
        f"<h1>{escape(title)}</h1><h2>Ringkasan insiden</h2><p>{escape(summary)}</p>"
        f"<p><strong>Judul asli:</strong> {escape(incident['title'])}</p>"
        f"<p><strong>Ringkasan sumber:</strong> {escape(incident['summary'])}</p>"
        f"<h2>Linimasa bukti</h2>{timeline_html}<h2>Perbandingan skenario</h2>{scenarios_html}"
        "<h2>Batasan model</h2><ul>" + "".join(f"<li>{escape(item)}</li>" for item in limitations) + "</ul>"
        "<h3>Metode dari simulator</h3>" + "".join(f"<p>{escape(method)}</p>" for method in methods)
    )
    html = (
        '<!doctype html><html lang="id"><head><meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">'
        f"<title>{escape(title)}</title><style>"
        "@page{size:A4 landscape;margin:15mm}body{font:13px/1.6 Arial,sans-serif;color:#17251b;background:#fff;margin:32px}"
        "h1{font-size:25px}h2{margin-top:28px;font-size:18px}h3{font-size:15px}"
        "table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10px}"
        "th,td{border:1px solid #8ca28f;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}"
        "th{background:#e7efe8}tr{break-inside:avoid}p,li{overflow-wrap:anywhere}"
        "@media print{body{margin:0}thead{display:table-header-group}h2,h3{break-after:avoid}}"
        f"</style></head><body>{content}</body></html>"
    )
    return {"filename": f"{incident['id']}.md", "markdown": markdown, "html": html}
