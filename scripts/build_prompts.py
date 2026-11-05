#!/usr/bin/env python3
"""Build all 64 prompts from the master formula.

Outputs prompts.json with every personality type variant, ready for batch generation.
"""
import json, os

OUT = os.path.join(os.path.dirname(__file__), "prompts.json")

# ============================================================
# 16 prototypes: archetype_id -> (cn_code, group, title, description, color_palette)
# ============================================================
PROTOTYPES = {
    # --- NT Analyst ---
    "INTJ": {
        "group": "analyst", "group_cn": "分析师",
        "title": "冷焰策士", "motto": "你不解释，你只是先算完了",
        "palette": "星云紫与深空靛蓝（#88619A / #5B3E96），电光紫与冷青全息光（#9B6DFF / #38BDF8），锋利的锐角多边形切面、高领风衣与解构西装、悬浮的超立方体与几何棋盘",
        "costume_prop": "身着结构硬朗、高立领设计的暗紫色与炭黑几何切面长风衣；单手虚托一枚悬浮的半透明磨砂玻璃国际象棋战车多面体棋子，棋子下方延展出全息网格推演路径，底座升腾着冷冽的紫蓝色几何折面冷焰",
    },
    "INTP": {
        "group": "analyst", "group_cn": "分析师",
        "title": "拆解者", "motto": "你拆开的不是东西，是前提",
        "palette": "星云紫与深空靛蓝（#88619A / #5B3E96），电光紫与冷青全息光（#9B6DFF / #38BDF8），锋利的锐角多边形切面、高领风衣与解构西装、悬浮的超立方体与几何棋盘",
        "costume_prop": "身着不对称剪裁的薰衣草紫与冷灰几何实验风卫衣，佩戴极简无框几何眼镜；双手面前悬浮着一个正在被逐层拆解开来、露出内部金色发光公理节点的半透明超立方体与几何鲁班锁结构",
    },
    "ENTJ": {
        "group": "analyst", "group_cn": "分析师",
        "title": "推土机型统帅", "motto": "路不通，那就把路修出来",
        "palette": "星云紫与深空靛蓝（#88619A / #5B3E96），电光紫与冷青全息光（#9B6DFF / #38BDF8），锋利的锐角多边形切面、高领风衣与解构西装、悬浮的超立方体与几何棋盘",
        "costume_prop": "身着肩线锋利、带有流金几何折线的深紫色定制西装披风；手握一枚散发强光的几何棱镜权杖与全息战略沙盘，脚下原本崎岖的暗色碎石网格正被一道笔直向前延伸的紫金色发光多边形大道瞬间劈开",
    },
    "ENTP": {
        "group": "analyst", "group_cn": "分析师",
        "title": "变量制造者", "motto": "你不是爱抬杠，你是真的看见了另一条路",
        "palette": "星云紫与深空靛蓝（#88619A / #5B3E96），电光紫与冷青全息光（#9B6DFF / #38BDF8），锋利的锐角多边形切面、高领风衣与解构西装、悬浮的超立方体与几何棋盘",
        "costume_prop": "身着带有霓虹紫边线的解构主义几何马甲与衬衫，领带呈几何折纸状微扬；双手之间抛玩着一枚不断重构形态的半透明分形魔方与发光莫比乌斯环，从中折射出多条指向不同维度的彩色分岔光束",
    },

    # --- NF Diplomat ---
    "INFJ": {
        "group": "diplomat", "group_cn": "外交家",
        "title": "深夜点灯人", "motto": "你看得见别人还没说出口的那句话",
        "palette": "翡翠薄荷与森林青（#33A474 / #1E7E5A），极光青与暖金微光（#2DD4BF / #FDE047），柔和的不对称折纸斗篷与长风衣、内含金色神经火种的半透明棱镜提灯与展厅",
        "costume_prop": "身着带有几何折线立领的深青色现代极简长风衣；手中轻托一盏悬浮的半透明多面体磨砂玻璃提灯，灯芯内部有一缕温暖的金色神经元突触微光正在照亮周围隐形的透明几何声波气泡",
    },
    "INFP": {
        "group": "diplomat", "group_cn": "外交家",
        "title": "内心博物馆", "motto": "你心里有一个别人进不去的展厅",
        "palette": "翡翠薄荷与森林青（#33A474 / #1E7E5A），极光青与暖金微光（#2DD4BF / #FDE047），柔和的不对称折纸斗篷与长风衣、内含金色神经火种的半透明棱镜提灯与展厅",
        "costume_prop": "身着柔和薄荷绿与米白拼接的宽松几何折纸感针织斗篷；双手在胸前温柔捧着一座微缩的半透明水晶多面体博物馆展厅，展厅内部悬浮着发光的几何折纸蝴蝶、微缩星云与纯净的记忆晶体",
    },
    "ENFP": {
        "group": "diplomat", "group_cn": "外交家",
        "title": "火种捕手", "motto": "你总在别人身上看见他还没成为的样子",
        "palette": "翡翠薄荷与森林青（#33A474 / #1E7E5A），极光青与暖金微光（#2DD4BF / #FDE047），柔和的不对称折纸斗篷与长风衣、内含金色神经火种的半透明棱镜提灯与展厅",
        "costume_prop": "身着充满活力的翠绿与暖橙撞色几何机能夹克，额前佩戴半透明发光护目镜；双手向前伸展，指尖跃动并捕捉着多颗多巴胺色彩的发光几何折纸火种，火种在空气中绽放成绚丽的棱镜光斑",
    },
    "ENFJ": {
        "group": "diplomat", "group_cn": "外交家",
        "title": "情绪调度师", "motto": "你能让一群人相信他们可以",
        "palette": "翡翠薄荷与森林青（#33A474 / #1E7E5A），极光青与暖金微光（#2DD4BF / #FDE047），柔和的不对称折纸斗篷与长风衣、内含金色神经火种的半透明棱镜提灯与展厅",
        "costume_prop": "身着剪裁利落、带有金色流线几何肩章的翡翠色礼服式长外衣；手持一根由发光声波与半透明几何光环交织而成的共鸣指挥棒，周身环绕着层层向外温暖扩散的青金色同心圆能量波纹",
    },

    # --- SJ Guardian ---
    "ISTJ": {
        "group": "guardian", "group_cn": "守护者",
        "title": "地基工程师", "motto": "你不出声，但你撑着整个结构",
        "palette": "冰川蓝与秩序钢青（#4298B4 / #2563EB），蓝宝石光与银白晶格（#38BDF8 / #E2E8F0），严格对称的六边形与正方体结构、笔挺的双排扣工装礼服、精密咬合的拱桥基座与矩阵",
        "costume_prop": "身着严谨对称、折线分明的深海蓝与冷灰几何结构工装礼服；双手稳稳托起一座精密咬合的半透明蓝宝石几何拱桥基座与发光激光铅垂线，脚下是坚不可摧的六边形蓝光晶格地基",
    },
    "ISFJ": {
        "group": "guardian", "group_cn": "守护者",
        "title": "沉默后勤部", "motto": "你记得所有人的忌口，除了自己的",
        "palette": "冰川蓝与秩序钢青（#4298B4 / #2563EB），蓝宝石光与银白晶格（#38BDF8 / #E2E8F0），严格对称的六边形与正方体结构、笔挺的双排扣工装礼服、精密咬合的拱桥基座与矩阵",
        "costume_prop": "身着温暖雾霾蓝与奶白拼接的几何切面毛呢外套，围着立体折纸感围巾；怀中小心护着一盏散发柔和治愈蓝光的半透明几何保温灯匣，灯匣周围井然有序地漂浮着记录着他人冷暖的微缩发光记忆胶囊",
    },
    "ESTJ": {
        "group": "guardian", "group_cn": "守护者",
        "title": "秩序执行官", "motto": "事情乱，是因为还没人把它排好",
        "palette": "冰川蓝与秩序钢青（#4298B4 / #2563EB），蓝宝石光与银白晶格（#38BDF8 / #E2E8F0），严格对称的六边形与正方体结构、笔挺的双排扣工装礼服、精密咬合的拱桥基座与矩阵",
        "costume_prop": "身着线条笔挺、带有银色几何徽章的钢青色双排扣制服；单手托着一面排列着精密发光甘特矩阵与几何齿轮组的半透明磨砂玻璃控制板，另一手轻轻一挥，空中散乱的多边形碎片正自动归位对齐成严整的阵列",
    },
    "ESFJ": {
        "group": "guardian", "group_cn": "守护者",
        "title": "关系维系者", "motto": "你在，大家才觉得这是一个圈子",
        "palette": "冰川蓝与秩序钢青（#4298B4 / #2563EB），蓝宝石光与银白晶格（#38BDF8 / #E2E8F0），严格对称的六边形与正方体结构、笔挺的双排扣工装礼服、精密咬合的拱桥基座与矩阵",
        "costume_prop": "身着亲和力极强的天青色与暖白几何切面开衫礼服；双手在身前编织着一个由多颗发光几何星辰节点连接而成的全息温暖圆环网络，每颗星辰之间都流淌着柔和的冰蓝与暖金交织光带",
    },

    # --- SP Adventurer ---
    "ISTP": {
        "group": "adventurer", "group_cn": "冒险家",
        "title": "手上见真章", "motto": "说那么多没用，先拆开看看",
        "palette": "琥珀金与曜石暖黄（#E4AE3A / #D97706），太阳耀斑金与珊瑚橙（#FBBF24 / #FB7185），充满动势的斜向流线三角形切面、机能夹克与工装背心、高速旋转的涡轮与声波花朵",
        "costume_prop": "身着干练的琥珀黄与深炭灰撞色几何机能工装背心，利落地卷起袖口；手中把玩着一把半透明发光精密几何卡尺，面前悬浮着一颗正在呈爆炸图逐层展开的发光微缩无人机涡轮引擎核心",
    },
    "ISFP": {
        "group": "adventurer", "group_cn": "冒险家",
        "title": "感官诗人", "motto": "你不争辩审美，你只是活在里面",
        "palette": "琥珀金与曜石暖黄（#E4AE3A / #D97706），太阳耀斑金与珊瑚橙（#FBBF24 / #FB7185），充满动势的斜向流线三角形切面、机能夹克与工装背心、高速旋转的涡轮与声波花朵",
        "costume_prop": "身着流动感几何折面设计的落日金与杏色艺术感长衫，佩戴不对称几何耳饰；指尖轻触一朵由半透明彩色磨砂玻璃与声波涟漪构成的发光几何花朵，身体周围漂浮着可视化的香气与色彩通感微粒",
    },
    "ESTP": {
        "group": "adventurer", "group_cn": "冒险家",
        "title": "局面拆弹手", "motto": "你想再多也没用，先上场",
        "palette": "琥珀金与曜石暖黄（#E4AE3A / #D97706），太阳耀斑金与珊瑚橙（#FBBF24 / #FB7185），充满动势的斜向流线三角形切面、机能夹克与工装背心、高速旋转的涡轮与声波花朵",
        "costume_prop": "身着凌厉的曜石黑与亮金几何切面机车风夹克，姿态矫健前倾；单手用一把发光几何钳干净利落地剪断一枚悬浮过载核心的红色警报能量线，将其在瞬间转化为稳定的金色多面体晶体",
    },
    "ESFP": {
        "group": "adventurer", "group_cn": "冒险家",
        "title": "现场发电机", "motto": "你在的地方，气氛就不会冷",
        "palette": "琥珀金与曜石暖黄（#E4AE3A / #D97706），太阳耀斑金与珊瑚橙（#FBBF24 / #FB7185），充满动势的斜向流线三角形切面、机能夹克与工装背心、高速旋转的涡轮与声波花朵",
        "costume_prop": "身着闪耀的暖金与珊瑚橙几何切面潮流舞台风套装；高举一枚折射出绚丽极光切面的多面体棱镜能量球，脚下绽放出层层向外跃动的几何音浪光环与金色星火",
    },
}

# ============================================================
# 4 suffix variants: suffix_id -> (season_cn, tone_cn, pose_armor, bg_field)
# ============================================================
SUFFIXES = {
    "A-O": {
        "season": "盛夏破局态", "tone": "坚定探索",
        "pose_armor": "昂首直视前方，双肩带有棱角分明的发光几何肩甲，象征心理防弹衣",
        "bg_field": "身后向外呈放射状飞散出大量动态的多巴胺发光三角形碎片与向前破壁的光束箭头，风衣下摆扬起，象征从零到一的开荒冲锋",
    },
    "A-H": {
        "season": "金秋建制态", "tone": "坚定守成",
        "pose_armor": "站姿稳如磐石，双手沉稳掌控核心道具，衣服折线边缘带有高对比度金色利落描边，象征稳定掌控",
        "bg_field": "脚下与身后浮现出严格对称的半透明六边形蜂巢晶格底座与全息秩序矩阵，象征系统建制与长期复利",
    },
    "C-O": {
        "season": "初春觉醒态", "tone": "内省探索",
        "pose_armor": "头部微倾呈敏锐倾听或深度思索状，胸前环绕一层细腻的半透明磨砂玻璃几何防护环，象征边界感与风险校准",
        "bg_field": "四周漂浮着不规则的发光神经元突触连线与向外试探的棱镜折射光束，象征在暗夜中捕捉新变量",
    },
    "C-H": {
        "season": "深冬内观态", "tone": "内省守成",
        "pose_armor": "目光温和地垂视手中的核心器物，全身笼罩在一座安静纯净的半透明磨砂水晶二十面体结界罩内部",
        "bg_field": "结界内流淌着井然有序的同心圆波纹，将外界喧嚣彻底隔绝，象征高纯度精神自留地与深度内观",
    },
}

# ============================================================
# Master formula — build full prompt per (prototype, suffix)
# ============================================================
STYLE_CORE = "16personalities经典扁平几何折面插画风格的AI时代升级版Neo-Geometric Vector与2.5D Translucent Glassmorphism结合，硬边几何矢量切面结合局部半透明磨砂毛玻璃材质与发光神经元网络线条，边缘锐利干净，大师级UI角色卡牌构图，半身至全身居中"

BG_CORE = "搭配深邃太空暗夜蓝（#0B0F19）极简纯色背景，柔和的体积光与边缘轮廓高光，8K超高清矢量渲染质感"

def build_prompt(code: str, suffix: str) -> dict:
    proto = PROTOTYPES[code]
    suf = SUFFIXES[suffix]
    full_code = f"{code}-{suffix}"
    title_cn = proto["title"]
    season_cn = suf["season"]

    prompt = f"""「棱镜心智 Neo-Poly 64」AI时代几何矢量卡通人物IP，对应人格类型「{full_code} {title_cn}·{season_cn}」，中性偏青年形象，五官采用极简几何切面与灵动点状眼眸设计，面部由干净利落的多边形低多边形色块折面构成，无写实毛孔。
{proto['costume_prop']}
{suf['pose_armor']}；{suf['bg_field']}；右上角悬浮一枚极简发光几何角标「{suffix}」。
{STYLE_CORE}。
主色调采用{proto['palette']}，{BG_CORE}。"""

    return {
        "code": full_code,
        "prototype": code,
        "suffix": suffix,
        "group": proto["group"],
        "group_cn": proto["group_cn"],
        "title_cn": title_cn,
        "season_cn": season_cn,
        "prompt": prompt,
    }

def main():
    all_prompts = []
    for code in sorted(PROTOTYPES.keys()):
        for suffix in ["A-O", "A-H", "C-O", "C-H"]:
            all_prompts.append(build_prompt(code, suffix))

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(all_prompts, f, ensure_ascii=False, indent=2)

    print(f"Built {len(all_prompts)} prompts -> {OUT}")
    # Quick sanity print first one
    print("\n--- Sample (INTJ-A-O) ---")
    print(all_prompts[0]["prompt"][:300], "...")

if __name__ == "__main__":
    main()
