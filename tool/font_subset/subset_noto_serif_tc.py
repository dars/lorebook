#!/usr/bin/env python3
"""NotoSerifTC 子集化：16MB 全字集 → 常用集，為 web 首載瘦身。

字元集組成（聯集）：
  1. JF7000 字表（justfont 七千字表：base＋台灣擴充＋人名擴充＋符號）
     來源：https://github.com/ButTaiwan/cjktables（taiwan/jf7000_*.txt 快照）
  2. lorebook lib/ 全部 .dart 原始碼出現過的字元（UI 字串保證不缺字）
  3. 5etools fork data/*.json 的全部字元（內容庫規則文本保證不缺字；
     路徑不存在時略過）
  4. ASCII 可印字元

罕字不在集內時 Flutter 會 fallback 系統字型——內容不會消失，只是字體不同。

用法（fonttools 需可 import；建議 venv）：
  python tool/font_subset/subset_noto_serif_tc.py

輸入：designs/fonts/NotoSerifTC-Variable.full.ttf（原始全字集，保留供重跑）
輸出：assets/fonts/NotoSerifTC-Variable.ttf（覆寫打包資產）
"""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent.parent
TABLES = Path(__file__).resolve().parent
FULL = ROOT / "designs/fonts/NotoSerifTC-Variable.full.ttf"
OUT = ROOT / "assets/fonts/NotoSerifTC-Variable.ttf"
FIVETOOLS_DATA = ROOT.parent / "5etools/data"


def chars_from_tables() -> set[str]:
    out: set[str] = set()
    for p in TABLES.glob("jf7000_*.txt"):
        for line in p.read_text(encoding="utf-8").splitlines():
            if not line or line.startswith("#"):
                continue
            cp = line.split("\t")[-1].strip()
            try:
                out.add(chr(int(cp, 16)))
            except ValueError:
                continue
    return out


def chars_from_sources() -> set[str]:
    out: set[str] = set()
    for p in (ROOT / "lib").rglob("*.dart"):
        out.update(p.read_text(encoding="utf-8"))
    if FIVETOOLS_DATA.is_dir():
        for p in FIVETOOLS_DATA.rglob("*.json"):
            out.update(p.read_text(encoding="utf-8", errors="ignore"))
    else:
        print(f"[warn] 找不到 {FIVETOOLS_DATA}，略過內容庫字元收集")
    return out


def main() -> None:
    charset = chars_from_tables() | chars_from_sources()
    charset |= {chr(c) for c in range(0x20, 0x7F)}  # ASCII
    charset = {c for c in charset if ord(c) >= 0x20 and not (0xD800 <= ord(c) <= 0xDFFF)}

    text_file = TABLES / ".charset.txt"
    text_file.write_text("".join(sorted(charset)), encoding="utf-8")
    print(f"字元集：{len(charset)} 字")

    subprocess.run(
        [
            sys.executable,
            "-m",
            "fontTools.subset",
            str(FULL),
            f"--text-file={text_file}",
            f"--output-file={OUT}",
            "--layout-features=*",  # 保留 kern/liga 等排版特性
            "--name-IDs=*",  # 保留字型名稱表，Flutter family 對得上
            "--notdef-outline",
        ],
        check=True,
    )
    text_file.unlink()
    before = FULL.stat().st_size // 1024
    after = OUT.stat().st_size // 1024
    print(f"{before}KB → {after}KB")


if __name__ == "__main__":
    main()
