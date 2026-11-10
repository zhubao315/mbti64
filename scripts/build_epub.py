#!/usr/bin/env python3
"""P2 · 构建 EPUB 3 电子书（幂等）

事实源：书-千分之一的你/{00-卷首, 01..06 卷, 07-卷末} 的章节源文件
插图：书-千分之一的你/插图/图NN.png（由 gen-book-art.mjs 生成）
封面：书-千分之一的你/装帧/封面.png

运行：python scripts/build_epub.py
输出：书-千分之一的你/《千分之一的你：从16型到64型》.epub

不依赖第三方库：Markdown→XHTML 用轻量状态机，打包用 zipfile。
"""
from __future__ import annotations

import datetime
import html
import json
import re
import sys
import uuid
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "书-千分之一的你"
DOCS = ROOT / "docs"
OUT = BOOK / "《千分之一的你：从16型到64型》.epub"
PLATE_DIR = BOOK / "插图"
COVER = BOOK / "装帧" / "封面.png"
PLATE_DOC = DOCS / "插图清单与图注.md"

VOLUMES = [
    ("第一卷 · 理论奠基", "01-第一卷-理论奠基"),
    ("第二卷 · 分析师族群 NT", "02-第二卷-分析师族群-NT"),
    ("第三卷 · 外交家族群 NF", "03-第三卷-外交家族群-NF"),
    ("第四卷 · 守护者族群 SJ", "04-第四卷-守护者族群-SJ"),
    ("第五卷 · 冒险家族群 SP", "05-第五卷-冒险家族群-SP"),
    ("第六卷 · 刻意练习工程", "06-第六卷-刻意练习工程"),
]
FRONT = ("卷首", "00-卷首")
BACK = ("卷末 · 附录与参考文献", "07-卷末")

# 与 scripts/bind-book.js 保持一致的插图置入规则
VOL_PLATES = {1: [1], 2: [2, 10], 3: [3], 4: [4], 5: [5], 6: [6]}
CHAPTER_POST = {"03": [8], "04": [9], "09": [11], "24": [12]}
TOC_PLATE = 7

TITLE = "千分之一的你：从16型到64型"
SUBTITLE = "人格画像、差异理解与成长练习"
AUTHOR = "朱宝"
LANG = "zh-CN"

CSS = """@page { margin: 1.2cm; }
body { font-family: "Noto Serif CJK SC", "SimSun", "Songti SC", serif;
       line-height: 1.78; color: #1B1E23; margin: 0 1em; }
h1, h2, h3, h4 { font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
                  line-height: 1.4; page-break-after: avoid; }
h1 { font-size: 1.75em; margin: 1.6em 0 0.9em; }
h2 { font-size: 1.35em; margin: 1.5em 0 0.7em; border-bottom: 1px solid #E5E7EB; padding-bottom: .3em; }
h3 { font-size: 1.12em; margin: 1.3em 0 0.6em; }
h4 { font-size: 1.0em; margin: 1.1em 0 0.5em; color: #374151; }
p { margin: 0 0 0.85em; }
blockquote { border-left: 3px solid #C9D3DE; background: #F8F9F8; color: #4B5563;
              margin: 1em 0; padding: .5em 1em; }
blockquote p { margin: .2em 0; }
ul, ol { margin: .6em 0 1em 1.4em; padding: 0; }
li { margin: .25em 0; }
hr { border: none; border-top: 1px solid #E5E7EB; margin: 2em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: .88em;
        page-break-inside: avoid; }
th, td { border: 1px solid #D9DEE5; padding: .4em .55em; text-align: left; vertical-align: top; }
th { background: #F1F3F6; font-weight: bold; }
code { font-family: "Consolas", monospace; background: #F3F4F6; padding: 0 .2em; font-size: .9em; }
pre { background: #F7F7F5; border: 1px solid #E5E7EB; padding: .8em;
      white-space: pre-wrap; word-wrap: break-word; font-size: .85em; }
pre code { background: none; padding: 0; }
a { color: #4A3AAE; text-decoration: none; }
img { max-width: 100%; height: auto; }
figure.plate { margin: 1.6em 0; text-align: center; page-break-inside: avoid; }
figure.plate img { max-width: 100%; }
figcaption { font-size: .84em; color: #6B7280; text-align: left;
             margin-top: .6em; line-height: 1.6; }
.cover { margin: 0; padding: 0; text-align: center; }
.cover img { width: 100%; max-width: 100%; }
"""

# --------------------------------------------------------------------------- Markdown → XHTML
def inline_md(s: str) -> str:
    """行内格式；先转义，再按 图片→链接→代码→粗体 顺序还原。"""
    s = html.escape(s, quote=False)
    # 图片（重写插图相对路径）
    def img_sub(m: re.Match) -> str:
        alt, src = m.group(1), m.group(2)
        src = re.sub(r"插图/图(\d+)\.png", lambda x: f"../images/plate-{int(x.group(1)):02d}.png", src)
        return f'<img src="{src}" alt="{alt}"/>'
    s = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", img_sub, s)
    # 链接：页内锚点在分章后失效，降级为纯文本
    def link_sub(m: re.Match) -> str:
        label, href = m.group(1), m.group(2)
        return label if href.startswith("#") else f'<a href="{href}">{label}</a>'
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link_sub, s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    return s


CJK_END = re.compile(r"[\u4e00-\u9fff，。！？；：、」』）…—]$")
CJK_START = re.compile(r"^[\u4e00-\u9fff「『（]")


def join_lines(parts: list[str]) -> str:
    """中文软换行直接拼接；中英交界处保留一个空格，避免英文单词粘连。"""
    out = ""
    for part in parts:
        if not out:
            out = part
        elif CJK_END.search(out) and CJK_START.match(part):
            out += part
        else:
            out += " " + part
    return out


def split_row(row: str) -> list[str]:
    row = row.replace("\\|", "\x00")
    cells = [c.strip() for c in row.strip().strip("|").split("|")]
    return [c.replace("\x00", "|") for c in cells]


def is_separator(cells: list[str]) -> bool:
    return bool(cells) and all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in cells)


def build_table(rows: list[str]) -> str:
    parsed = [split_row(r) for r in rows]
    has_head = len(parsed) > 1 and is_separator(parsed[1])
    out = ['<table>']
    if has_head:
        out.append("<thead><tr>" + "".join(f"<th>{inline_md(c)}</th>" for c in parsed[0]) + "</tr></thead>")
        body = parsed[2:]
    else:
        body = parsed
    out.append("<tbody>")
    for r in body:
        if is_separator(r):
            continue
        out.append("<tr>" + "".join(f"<td>{inline_md(c)}</td>" for c in r) + "</tr>")
    out.append("</tbody></table>")
    return "".join(out)


def md_to_xhtml(text: str) -> str:
    lines = text.split("\n")
    out: list[str] = []
    para: list[str] = []

    def flush() -> None:
        if para:
            out.append("<p>" + inline_md(join_lines(para)) + "</p>")
            para.clear()

    i = 0
    n = len(lines)
    while i < n:
        s = lines[i].strip()
        if not s:
            flush(); i += 1; continue
        if s.startswith("```"):
            flush()
            i += 1
            code: list[str] = []
            while i < n and not lines[i].strip().startswith("```"):
                code.append(html.escape(lines[i], quote=False)); i += 1
            i += 1
            out.append("<pre><code>" + "\n".join(code) + "</code></pre>")
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            flush()
            lvl = len(m.group(1))
            out.append(f"<h{lvl}>" + inline_md(m.group(2)) + f"</h{lvl}>")
            i += 1; continue
        if re.fullmatch(r"-{3,}|\*{3,}|_{3,}", s):
            flush(); out.append("<hr/>"); i += 1; continue
        if s.startswith("|") and s.endswith("|"):
            flush()
            rows: list[str] = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(lines[i].strip()); i += 1
            out.append(build_table(rows))
            continue
        if s.startswith(">"):
            flush()
            quote: list[str] = []
            while i < n and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip().lstrip(">").strip()); i += 1
            out.append("<blockquote><p>" + inline_md(join_lines(quote)) + "</p></blockquote>")
            continue
        ordered = bool(re.match(r"^\d+\.\s+", s))
        bullet = bool(re.match(r"^[-*+]\s+", s))
        if ordered or bullet:
            flush()
            items: list[str] = []
            while i < n:
                ls = lines[i].strip()
                if ordered and re.match(r"^\d+\.\s+", ls):
                    items.append(re.sub(r"^\d+\.\s+", "", ls))
                elif not ordered and re.match(r"^[-*+]\s+", ls):
                    items.append(re.sub(r"^[-*+]\s+", "", ls))
                else:
                    break
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{inline_md(x)}</li>" for x in items) + f"</{tag}>")
            continue
        para.append(s)
        i += 1
    flush()
    return "\n".join(out)


# --------------------------------------------------------------------------- 结构与素材
def read_plates() -> dict[int, dict[str, str]]:
    doc = PLATE_DOC.read_text(encoding="utf-8")
    m = re.search(r"## 插图目录\s*\n([\s\S]*?)(?=\n---|\n## )", doc)
    if not m:
        raise RuntimeError("未找到插图目录表格")
    plates: dict[int, dict[str, str]] = {}
    for line in m.group(1).splitlines():
        cols = [c.strip() for c in line.split("|")[1:-1]]
        if len(cols) >= 4 and cols[0].isdigit():
            plates[int(cols[0])] = {"place": cols[1], "title": cols[2], "caption": cols[3]}
    return plates


def figure(no: int, plates: dict[int, dict[str, str]]) -> str:
    p = plates.get(no)
    if not p:
        return ""
    src = f"../images/plate-{no:02d}.png"
    return (
        f'<figure class="plate"><img src="{src}" alt="图 {no} · {html.escape(p["title"], quote=True)}"/>'
        f'<figcaption><strong>图 {no} · {inline_md(p["title"])}</strong>　'
        f'{inline_md(p["caption"])}</figcaption></figure>'
    )


def xhtml_page(title: str, body: str, css: str = "../style.css") -> str:
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!DOCTYPE html>\n'
        '<html xmlns="http://www.w3.org/1999/xhtml" '
        'xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">\n'
        f'<head><title>{html.escape(title)}</title>'
        f'<link rel="stylesheet" type="text/css" href="{css}"/></head>\n'
        f'<body>\n{body}\n</body>\n</html>\n'
    )


def collect_dir(dirname: str) -> list[Path]:
    d = BOOK / dirname
    return sorted(p for p in d.glob("*.md") if p.name != "README.md")


def title_of(content: str, path: Path) -> str:
    for line in content.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem


# --------------------------------------------------------------------------- 主流程
def main() -> int:
    if not COVER.exists():
        print(f"❌ 封面缺失：{COVER}")
        return 1
    plates = read_plates()
    missing = [n for n in range(1, 13) if not (PLATE_DIR / f"图{n:02d}.png").exists()]
    if missing:
        print(f"❌ 插图终稿缺失：{missing}")
        return 1

    files: dict[str, bytes | str] = {}
    docs: list[dict] = []          # spine 条目
    nav_groups: list[tuple[str, list[tuple[str, str]]]] = []

    # 封面页
    files["OEBPS/cover.xhtml"] = xhtml_page(
        "封面", '<div class="cover"><img src="images/cover.png" alt="封面"/></div>',
        css="style.css",
    )
    files["OEBPS/images/cover.png"] = COVER.read_bytes()

    # 插图目录页（含图 7）
    table_md = re.search(r"## 插图目录\s*\n([\s\S]*?)(?=\n---|\n## )",
                         PLATE_DOC.read_text(encoding="utf-8")).group(1).strip()
    plates_body = (
        "<h1>插图目录</h1>"
        "<blockquote><p>全书 12 处插图均为帮助理解的示意，不是证据；涉及稀有度的图标注「模型计算，非人口统计」。</p></blockquote>"
        + md_to_xhtml(table_md)
        + figure(TOC_PLATE, plates)
    )
    files["OEBPS/text/plates.xhtml"] = xhtml_page("插图目录", plates_body)
    docs.append({"id": "plates", "href": "text/plates.xhtml", "title": "插图目录"})
    nav_groups.append(("全书", [("插图目录", "text/plates.xhtml")]))

    # 12 张图 + 图 7 已在上面
    for n in range(1, 13):
        files[f"OEBPS/images/plate-{n:02d}.png"] = (PLATE_DIR / f"图{n:02d}.png").read_bytes()

    # 正文：卷首 → 六卷 → 卷末
    idx = 0
    groups = [FRONT] + VOLUMES + [BACK]
    for gi, (gname, dirname) in enumerate(groups):
        vol_no = gi if 1 <= gi <= 6 else None
        entries: list[tuple[str, str]] = []
        for k, p in enumerate(collect_dir(dirname)):
            content = p.read_text(encoding="utf-8")
            title = title_of(content, p)
            body = md_to_xhtml(content)
            pre, post = "", ""
            if vol_no and k == 0:
                pre = "".join(figure(n, plates) for n in VOL_PLATES.get(vol_no, []))
            m = re.match(r"^第(\d\d)章", p.name)
            if m:
                post = "".join(figure(n, plates) for n in CHAPTER_POST.get(m.group(1), []))
            doc_id = f"part-{idx:03d}"
            href = f"text/{doc_id}.xhtml"
            files[f"OEBPS/{href}"] = xhtml_page(title, pre + body + post)
            docs.append({"id": doc_id, "href": href, "title": title})
            entries.append((title, href))
            idx += 1
        nav_groups.append((gname, entries))

    # nav.xhtml
    nav_items = []
    for gname, entries in nav_groups:
        nav_items.append(f"<li><span>{html.escape(gname)}</span><ol>")
        for t, href in entries:
            nav_items.append(f'<li><a href="{href}">{html.escape(t)}</a></li>')
        nav_items.append("</ol></li>")
    files["OEBPS/nav.xhtml"] = xhtml_page(
        "目录",
        '<nav epub:type="toc" id="toc"><h1>全书目录</h1><ol>' + "".join(nav_items) + "</ol></nav>",
        css="style.css",
    )
    files["OEBPS/style.css"] = CSS

    # content.opf
    book_uuid = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://64personalities.cn/book/qianfenzhiyide-ni"))
    modified = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="css" href="style.css" media-type="text/css"/>',
        '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>',
        '<item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/>',
    ]
    for n in range(1, 13):
        manifest.append(f'<item id="img-{n:02d}" href="images/plate-{n:02d}.png" media-type="image/png"/>')
    for d in docs:
        manifest.append(f'<item id="{d["id"]}" href="{d["href"]}" media-type="application/xhtml+xml"/>')
    spine = ['<itemref idref="cover"/>', '<itemref idref="nav"/>'] + [
        f'<itemref idref="{d["id"]}"/>' for d in docs
    ]
    opf = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">\n'
        '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
        f'    <dc:identifier id="bookid">urn:uuid:{book_uuid}</dc:identifier>\n'
        f'    <dc:title>{html.escape(TITLE)}</dc:title>\n'
        f'    <dc:creator>{html.escape(AUTHOR)}</dc:creator>\n'
        f'    <dc:language>{LANG}</dc:language>\n'
        f'    <dc:description>{html.escape(SUBTITLE)}；原创心理学科普作品，64 型为作者提出的扩展探索框架，非心理测量分类体系。</dc:description>\n'
        f'    <meta property="dcterms:modified">{modified}</meta>\n'
        '    <meta name="cover" content="cover-image"/>\n'
        '  </metadata>\n'
        '  <manifest>\n    ' + "\n    ".join(manifest) + '\n  </manifest>\n'
        '  <spine>\n    ' + "\n    ".join(spine) + '\n  </spine>\n'
        '</package>\n'
    )
    files["OEBPS/content.opf"] = opf
    files["META-INF/container.xml"] = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
        '  <rootfiles><rootfile full-path="OEBPS/content.opf" '
        'media-type="application/oebps-package+xml"/></rootfiles>\n'
        '</container>\n'
    )

    # 打包（mimetype 必须第一个且 ZIP_STORED）
    if OUT.exists():
        OUT.unlink()
    with zipfile.ZipFile(OUT, "w") as z:
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        for rel, data in files.items():
            z.writestr(rel, data, compress_type=zipfile.ZIP_DEFLATED)

    # ------------------------------------------------------------------ 自校验
    print(f"📦 EPUB 已生成：{OUT.name}  {OUT.stat().st_size / 1024 / 1024:.1f} MB")
    errors: list[str] = []
    with zipfile.ZipFile(OUT) as z:
        names = z.namelist()
        if names[0] != "mimetype" or z.getinfo("mimetype").compress_type != zipfile.ZIP_STORED:
            errors.append("mimetype 必须是首个且未压缩条目")
        if z.read("mimetype").decode() != "application/epub+zip":
            errors.append("mimetype 内容错误")
        for required in ["META-INF/container.xml", "OEBPS/content.opf", "OEBPS/nav.xhtml",
                         "OEBPS/cover.xhtml", "OEBPS/style.css", "OEBPS/images/cover.png"]:
            if required not in names:
                errors.append(f"缺少 {required}")
        # manifest 引用完整性
        opf_xml = ET.fromstring(z.read("OEBPS/content.opf"))
        ns = {"opf": "http://www.idpf.org/2007/opf"}
        for item in opf_xml.findall(".//opf:item", ns):
            href = item.get("href")
            if href and f"OEBPS/{href}" not in names:
                errors.append(f"manifest 引用缺失：{href}")
        # XHTML 合法性与图片引用
        xhtmls = [n for n in names if n.endswith(".xhtml")]
        for x in xhtmls:
            try:
                ET.fromstring(z.read(x))
            except ET.ParseError as e:
                errors.append(f"XHTML 解析失败 {x}: {e}")
            for src in re.findall(rb'<img[^>]+src="([^"]+)"', z.read(x)):
                target = src.decode()
                resolved = ("OEBPS/" + target) if not target.startswith("../") else \
                    "OEBPS/" + re.sub(r"^\.\./", "", target)
                if resolved not in names:
                    errors.append(f"{x} 图片失效：{target}")
    print(f"   条目 {len(names)} 个 | XHTML {len(xhtmls)} 篇 | 图片 13 张 | 正文 {idx} 篇")
    if errors:
        print("❌ 校验未通过：")
        for e in errors[:20]:
            print("   -", e)
        return 1
    print("   ✅ mimetype / container / OPF / nav / XHTML / 图片引用全部通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
