"""
Recalibra Lateralidad según Latelaridad.md:
- Figura de frente → L/R anatómico de la figura (espejo en pantalla).
- Niveles exactos: 3→4, 4→6, 5-6→9 preguntas.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "public/catalogo_juegos/Polimotor/Reconocimiento/img"
CFG = ROOT / "public/catalogo_juegos/Polimotor/Lateralidad/config.json"
PREV = ROOT / "scripts/_zone_preview"


def opaque(px, x, y) -> bool:
    r, g, b, a = px[x, y]
    return a >= 64 and (r + g + b) > 40


def bbox(im: Image.Image, xs: int, ys: int, xe: int, ye: int):
    px = im.load()
    minx, miny, maxx, maxy = xe, ye, xs, ys
    found = False
    for y in range(ys, ye):
        for x in range(xs, xe):
            if opaque(px, x, y):
                found = True
                if x < minx:
                    minx = x
                if x > maxx:
                    maxx = x
                if y < miny:
                    miny = y
                if y > maxy:
                    maxy = y
    if not found:
        return None
    return minx, miny, maxx + 1, maxy + 1


def pct(W: int, H: int, x0: int, y0: int, x1: int, y1: int) -> dict:
    return {
        "x": round(x0 / W * 100, 1),
        "y": round(y0 / H * 100, 1),
        "w": round((x1 - x0) / W * 100, 1),
        "h": round((y1 - y0) / H * 100, 1),
    }


def pad_box(b, W, H, p=6):
    x0, y0, x1, y1 = b
    return max(0, x0 - p), max(0, y0 - p), min(W, x1 + p), min(H, y1 + p)


def measure(cuerpo: str) -> dict:
    im = Image.open(IMG / cuerpo / "completo.png").convert("RGBA")
    W, H = im.size
    mid = W // 2

    # Anatomía de la figura de frente:
    # derecha de la figura = izquierda de la pantalla (x bajo)
    # izquierda de la figura = derecha de la pantalla (x alto)
    specs = {
        "cabeza": (int(0.12 * W), int(0.00 * H), int(0.88 * W), int(0.32 * H)),
        "hombro_der": (int(0.18 * W), int(0.30 * H), mid - 8, int(0.40 * H)),
        "hombro_izq": (mid + 8, int(0.30 * H), int(0.82 * W), int(0.40 * H)),
        # Brazo/codo SIN invadir la mano (si se solapan, gana la zona más chica y falla el reto)
        "brazo_der": (int(0.02 * W), int(0.38 * H), int(0.28 * W), int(0.48 * H)),
        "brazo_izq": (int(0.72 * W), int(0.38 * H), int(0.98 * W), int(0.48 * H)),
        "codo_der": (int(0.02 * W), int(0.44 * H), int(0.26 * W), int(0.51 * H)),
        "codo_izq": (int(0.74 * W), int(0.44 * H), int(0.98 * W), int(0.51 * H)),
        "mano_der": (int(0.00 * W), int(0.50 * H), int(0.26 * W), int(0.62 * H)),
        "mano_izq": (int(0.74 * W), int(0.50 * H), W, int(0.62 * H)),
        "barriga": (int(0.32 * W), int(0.42 * H), int(0.68 * W), int(0.60 * H)),
        "pierna_der": (int(0.24 * W), int(0.62 * H), mid - 10, int(0.76 * H)),
        "pierna_izq": (mid + 10, int(0.62 * H), int(0.76 * W), int(0.76 * H)),
        "rodilla_der": (int(0.26 * W), int(0.74 * H), mid - 12, int(0.82 * H)),
        "rodilla_izq": (mid + 12, int(0.74 * H), int(0.74 * W), int(0.82 * H)),
        "tobillo_der": (int(0.28 * W), int(0.81 * H), mid - 14, int(0.87 * H)),
        "tobillo_izq": (mid + 14, int(0.81 * H), int(0.72 * W), int(0.87 * H)),
        "pie_der": (int(0.16 * W), int(0.87 * H), mid - 6, int(0.99 * H)),
        "pie_izq": (mid + 6, int(0.87 * H), int(0.84 * W), int(0.99 * H)),
    }

    zonas = {}
    for name, (xs, ys, xe, ye) in specs.items():
        b = bbox(im, xs, ys, xe, ye)
        if not b:
            raise RuntimeError(f"{cuerpo}.{name} vacío")
        zonas[name] = pct(W, H, *pad_box(b, W, H))
    return {"w": W, "h": H, "zonas": zonas}


def q(texto: str, lado: str, targets: list[str], flecha: bool = False) -> dict:
    item = {"texto": texto, "lado": lado, "targets": targets}
    if flecha:
        item["flecha"] = True
    return item


def main() -> None:
    nina = measure("nina")
    nino = measure("nino")

    cfg = json.loads(CFG.read_text(encoding="utf-8"))
    cfg["cuerpos"]["nina"]["lienzo"] = {"w": nina["w"], "h": nina["h"]}
    cfg["cuerpos"]["nina"]["zonas"] = nina["zonas"]
    cfg["cuerpos"]["nino"]["lienzo"] = {"w": nino["w"], "h": nino["h"]}
    cfg["cuerpos"]["nino"]["zonas"] = nino["zonas"]

    # Exacto Latelaridad.md
    cfg["niveles"] = [
        {
            "id": "3",
            "edad": "3 años",
            "titulo": "4 partes",
            "preguntas": [
                q("Toca la mano derecha.", "derecha", ["mano_der"], flecha=True),
                q("Toca la mano izquierda.", "izquierda", ["mano_izq"], flecha=True),
                q("Toca el pie derecho.", "derecha", ["pie_der"], flecha=True),
                q("Toca el pie izquierdo.", "izquierda", ["pie_izq"], flecha=True),
            ],
        },
        {
            "id": "4",
            "edad": "4 años",
            "titulo": "6 partes",
            "preguntas": [
                q("Toca la mano derecha.", "derecha", ["mano_der"]),
                q("Toca la mano izquierda.", "izquierda", ["mano_izq"]),
                q("Toca el pie derecho.", "derecha", ["pie_der"]),
                q("Toca el pie izquierdo.", "izquierda", ["pie_izq"]),
                q("Toca el brazo derecho.", "derecha", ["brazo_der", "codo_der"]),
                q("Toca la pierna izquierda.", "izquierda", ["pierna_izq", "rodilla_izq", "tobillo_izq"]),
            ],
        },
        {
            "id": "5",
            "edad": "5-6 años",
            "titulo": "9 partes",
            "preguntas": [
                q("Toca la mano derecha.", "derecha", ["mano_der"]),
                q("Toca la mano izquierda.", "izquierda", ["mano_izq"]),
                q("Toca el pie derecho.", "derecha", ["pie_der"]),
                q("Toca el pie izquierdo.", "izquierda", ["pie_izq"]),
                q("Toca el brazo derecho.", "derecha", ["brazo_der", "codo_der"]),
                q("Toca la pierna izquierda.", "izquierda", ["pierna_izq", "rodilla_izq", "tobillo_izq"]),
                q("Toca el hombro derecho.", "derecha", ["hombro_der"]),
                q("Toca la rodilla izquierda.", "izquierda", ["rodilla_izq"]),
                q("Toca el codo derecho.", "derecha", ["codo_der"]),
            ],
        },
    ]

    for cuerpo, data in (("nina", nina), ("nino", nino)):
        z = data["zonas"]
        for part in ("mano", "pie", "brazo", "pierna", "hombro", "rodilla", "codo"):
            der = z[f"{part}_der"]
            izq = z[f"{part}_izq"]
            cx_der = der["x"] + der["w"] / 2
            cx_izq = izq["x"] + izq["w"] / 2
            assert cx_der < 50 < cx_izq, f"{cuerpo}.{part} no anatómico: der={cx_der} izq={cx_izq}"
        assert z["pierna_izq"]["y"] + z["pierna_izq"]["h"] <= z["pie_izq"]["y"] + 2

    CFG.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    PREV.mkdir(exist_ok=True)
    colors = {
        "cabeza": (255, 255, 0),
        "hombro_der": (0, 200, 255),
        "hombro_izq": (0, 200, 255),
        "brazo_der": (255, 0, 255),
        "brazo_izq": (255, 0, 255),
        "codo_der": (255, 160, 0),
        "codo_izq": (255, 160, 0),
        "mano_der": (0, 255, 0),
        "mano_izq": (0, 255, 0),
        "barriga": (120, 120, 255),
        "pierna_der": (255, 60, 60),
        "pierna_izq": (255, 60, 60),
        "rodilla_der": (60, 255, 60),
        "rodilla_izq": (60, 255, 60),
        "tobillo_der": (80, 80, 255),
        "tobillo_izq": (80, 80, 255),
        "pie_der": (255, 255, 255),
        "pie_izq": (255, 255, 255),
    }
    for cuerpo, data in (("nina", nina), ("nino", nino)):
        im = Image.open(IMG / cuerpo / "completo.png").convert("RGBA")
        W, H = im.size
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        for k, z in data["zonas"].items():
            box = (
                z["x"] / 100 * W,
                z["y"] / 100 * H,
                (z["x"] + z["w"]) / 100 * W,
                (z["y"] + z["h"]) / 100 * H,
            )
            r, g, b = colors[k]
            d.rectangle(box, outline=(r, g, b, 255), width=3)
            d.rectangle(box, fill=(r, g, b, 70))
        Image.alpha_composite(im, overlay).save(PREV / f"{cuerpo}_anatomico.png")
        print("preview", PREV / f"{cuerpo}_anatomico.png")

    print("mano_der nina cx", nina["zonas"]["mano_der"]["x"] + nina["zonas"]["mano_der"]["w"] / 2)
    print("mano_izq nina cx", nina["zonas"]["mano_izq"]["x"] + nina["zonas"]["mano_izq"]["w"] / 2)
    print("brazo_der nina", nina["zonas"]["brazo_der"])
    print("OK levels", [len(n["preguntas"]) for n in cfg["niveles"]])


if __name__ == "__main__":
    main()
