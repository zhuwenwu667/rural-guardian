const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak, LevelFormat
} = require('docx');
const fs = require('fs');
const path = require('path');

const cjkFont = 'Microsoft YaHei';
const asciiFont = 'Arial';

// 读取图片
function loadImage(imgPath) {
  try {
    return fs.readFileSync(imgPath);
  } catch (e) {
    console.log('Image not found:', imgPath);
    return null;
  }
}

// 图片路径
const docsDir = path.join(__dirname, '../src/assets/docs');
const images = {
  systemArch: loadImage(path.join(docsDir, 'system-architecture.jpg')),
  funcModules: loadImage(path.join(docsDir, 'function-modules.jpg')),
  erDiagram: loadImage(path.join(docsDir, 'er-diagram.jpg')),
  alertFlow: loadImage(path.join(docsDir, 'alert-flow.jpg')),
  orderFlow: loadImage(path.join(docsDir, 'order-flow.jpg')),
  approvalFlow: loadImage(path.join(docsDir, 'approval-flow.jpg')),
};

// 边框样式
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

// 创建表格单元格
function createCell(text, width, isHeader = false, bgColor = 'E6F0FA') {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: isHeader ? bgColor : 'FFFFFF', type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text,
        font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
        size: 22,
        bold: isHeader
      })]
    })]
  });
}

// 创建数据单元格
function createDataCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({
        text,
        font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
        size: 20
      })]
    })]
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
          size: 24
        }
      }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, color: '1F4E79' },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0, keepNext: false, keepLines: false }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, color: '2E75B6' },
        paragraph: { spacing: { before: 280, after: 180 }, outlineLevel: 1, keepNext: false, keepLines: false }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, color: '404040' },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2, keepNext: false, keepLines: false }
      },
    ]
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 16838, height: 11906 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: '乡村守护者智慧养老平台 - 需求设计说明书',
            font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
            size: 18,
            color: '666666'
          })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: '第 ',
              font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
              size: 18
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
              size: 18
            }),
            new TextRun({
              text: ' 页',
              font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
              size: 18
            })
          ]
        })]
      })
    },
    children: [
      // ========== 封面 ==========
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({
          text: '乡村守护者智慧养老平台',
          font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
          size: 56,
          bold: true,
          color: '1F4E79'
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
        children: [new TextRun({
          text: '需求设计说明书',
          font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
          size: 40,
          bold: true,
          color: '2E75B6'
        })]
      }),
      new Paragraph({ spacing: { after: 600 } }),
      // 封面信息表格
      new Table({
        width: { size: 60, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        columnWidths: [3000, 5000],
        rows: [
          new TableRow({
            children: [
              createCell('文档版本', 3000, true),
              createDataCell('V3.0', 5000)
            ]
          }),
          new TableRow({
            children: [
              createCell('编制日期', 3000, true),
              createDataCell('2024年', 5000)
            ]
          }),
          new TableRow({
            children: [
              createCell('编制单位', 3000, true),
              createDataCell('技术研发部', 5000)
            ]
          }),
        ]
      }),

      // 分页
      new Paragraph({ children: [new PageBreak()] }),

      // ========== 目录 ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('目录')] }),
      new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: '1. 项目概述', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 24, bold: true })] }),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: '2. 系统架构设计', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 24, bold: true })] }),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: '3. 功能模块设计', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 24, bold: true })] }),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: '4. 数据库设计', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 24, bold: true })] }),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: '5. 业务流程设计', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 24, bold: true })] }),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: '6. 角色权限设计', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 24, bold: true })] }),
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [new TextRun({ text: '7. API接口设计', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 24, bold: true })] }),

      // 分页
      new Paragraph({ children: [new PageBreak()] }),

      // ========== 1. 项目概述 ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('1. 项目概述')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('1.1 项目背景')] }),
      new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '随着我国人口老龄化程度不断加深，养老服务需求日益增长。乡村地区由于地理分散、医疗资源匮乏等因素，空巢老人、独居老人的安全问题尤为突出。建设一套智慧养老服务平台，实现对老年人健康状况的实时监测、异常情况的快速响应、服务资源的高效调配，具有重要的社会意义。', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('1.2 项目目标')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '构建覆盖政府、村级、服务商、家庭的多层级养老服务体系', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '实现老年人健康数据的智能采集、分析与预警', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '建立高效的告警响应和工单处理机制', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '提供标准化的服务流程和质量评价体系', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('1.3 系统角色')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2500, 2000, 6500],
        rows: [
          new TableRow({ children: [createCell('角色', 2500, true), createCell('代码', 2000, true), createCell('职责描述', 6500, true)] }),
          new TableRow({ children: [createDataCell('政府管理员', 2500), createDataCell('GOV_ADMIN', 2000), createDataCell('区县级养老服务监管者，负责政策制定、数据统计、服务商资质审核', 6500)] }),
          new TableRow({ children: [createDataCell('村级专员', 2500), createDataCell('VILLAGE_STAFF', 2000), createDataCell('村里养老服务的第一责任人，负责老人管理、告警处置、工单派发', 6500)] }),
          new TableRow({ children: [createDataCell('服务商', 2500), createDataCell('PROVIDER', 2000), createDataCell('提供养老服务的专业机构或个人，负责服务执行和质量保障', 6500)] }),
          new TableRow({ children: [createDataCell('家属', 2500), createDataCell('FAMILY_MEMBER', 2000), createDataCell('老年人的家庭成员，负责服务预约、评价和特殊情况确认', 6500)] }),
          new TableRow({ children: [createDataCell('老人', 2500), createDataCell('ELDERLY', 2000), createDataCell('服务的直接受益者，可发起求助请求和基础服务需求', 6500)] }),
        ]
      }),

      // 分页
      new Paragraph({ children: [new PageBreak()] }),

      // ========== 2. 系统架构设计 ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('2. 系统架构设计')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.1 系统架构图')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '系统采用前后端分离架构，前端基于Vue 3构建，后端基于Node.js + Express实现RESTful API服务。', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      // 插入系统架构图
      images.systemArch ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new ImageRun({
          type: 'jpg',
          data: images.systemArch,
          transformation: { width: 600, height: 340 },
          altText: { title: '系统架构图', description: '乡村守护者平台系统架构', name: 'system-architecture' }
        })]
      }) : new Paragraph({ children: [new TextRun('【系统架构图】')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.2 技术选型')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2500, 3000, 5500],
        rows: [
          new TableRow({ children: [createCell('层次', 2500, true), createCell('技术栈', 3000, true), createCell('说明', 5500, true)] }),
          new TableRow({ children: [createDataCell('前端框架', 2500), createDataCell('Vue 3 + Vite', 3000), createDataCell('渐进式JavaScript框架，组件化开发', 5500)] }),
          new TableRow({ children: [createDataCell('UI组件库', 2500), createDataCell('Element Plus', 3000), createDataCell('基于Vue 3的组件库，提供丰富的UI组件', 5500)] }),
          new TableRow({ children: [createDataCell('图表库', 2500), createDataCell('ECharts', 3000), createDataCell('可视化图表库，支持多种图表类型', 5500)] }),
          new TableRow({ children: [createDataCell('后端框架', 2500), createDataCell('Node.js + Express', 3000), createDataCell('轻量级Web应用框架', 5500)] }),
          new TableRow({ children: [createDataCell('数据库', 2500), createDataCell('SQLite/MySQL', 3000), createDataCell('关系型数据库，支持本地和云端部署', 5500)] }),
          new TableRow({ children: [createDataCell('认证授权', 2500), createDataCell('JWT', 3000), createDataCell('JSON Web Token实现无状态认证', 5500)] }),
        ]
      }),

      // 分页
      new Paragraph({ children: [new PageBreak()] }),

      // ========== 3. 功能模块设计 ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3. 功能模块设计')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.1 功能模块图')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '系统面向五个角色提供差异化功能服务，各角色功能模块相互协同，形成完整的养老服务闭环。', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      // 插入功能模块图
      images.funcModules ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new ImageRun({
          type: 'jpg',
          data: images.funcModules,
          transformation: { width: 600, height: 340 },
          altText: { title: '功能模块图', description: '各角色功能模块划分', name: 'function-modules' }
        })]
      }) : new Paragraph({ children: [new TextRun('【功能模块图】')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.2 核心业务流程模块')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('3.2.1 告警审批流程')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '接单：村级专员接收告警，开始处理流程', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '处置：记录处置过程，上传现场照片', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '流转记录：全程记录操作人、时间、备注', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '升级机制：超出处理能力自动或手动升级', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('3.2.2 工单流转流程')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '派单：支持手动派单、智能派单、抢单三种模式', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '接单：服务商接收工单，确认服务时间', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '完成：服务完成后提交服务报告', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '评价：家属对服务进行星级评价', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('3.2.3 审批中心')] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '家属绑定审批：审核家属与老人的关联关系', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),
      new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: '设备绑定审批：审核设备与老人的绑定关系', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      // 分页
      new Paragraph({ children: [new PageBreak()] }),

      // ========== 4. 数据库设计 ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('4. 数据库设计')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.1 数据库ER图')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '数据库设计遵循第三范式，确保数据完整性和一致性。核心实体包括用户、村庄、老人、告警、工单、服务商等。', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      // 插入ER图
      images.erDiagram ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new ImageRun({
          type: 'jpg',
          data: images.erDiagram,
          transformation: { width: 600, height: 340 },
          altText: { title: '数据库ER图', description: '数据库实体关系图', name: 'er-diagram' }
        })]
      }) : new Paragraph({ children: [new TextRun('【数据库ER图】')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.2 核心数据表')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('4.2.1 系统用户表 (sys_user)')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2500, 1500, 2000, 5000],
        rows: [
          new TableRow({ children: [createCell('字段名', 2500, true), createCell('类型', 1500, true), createCell('约束', 2000, true), createCell('说明', 5000, true)] }),
          new TableRow({ children: [createDataCell('id', 2500), createDataCell('INTEGER', 1500), createDataCell('PK', 2000), createDataCell('用户ID', 5000)] }),
          new TableRow({ children: [createDataCell('username', 2500), createDataCell('TEXT', 1500), createDataCell('NOT NULL', 2000), createDataCell('登录用户名', 5000)] }),
          new TableRow({ children: [createDataCell('role', 2500), createDataCell('TEXT', 1500), createDataCell('NOT NULL', 2000), createDataCell('角色代码', 5000)] }),
          new TableRow({ children: [createDataCell('village_id', 2500), createDataCell('INTEGER', 1500), createDataCell('FK', 2000), createDataCell('所属村庄', 5000)] }),
          new TableRow({ children: [createDataCell('status', 2500), createDataCell('INTEGER', 1500), createDataCell('DEFAULT 1', 2000), createDataCell('状态', 5000)] }),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('4.2.2 告警记录表 (alert_record)')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2500, 1500, 2000, 5000],
        rows: [
          new TableRow({ children: [createCell('字段名', 2500, true), createCell('类型', 1500, true), createCell('约束', 2000, true), createCell('说明', 5000, true)] }),
          new TableRow({ children: [createDataCell('id', 2500), createDataCell('INTEGER', 1500), createDataCell('PK', 2000), createDataCell('告警ID', 5000)] }),
          new TableRow({ children: [createDataCell('elderly_id', 2500), createDataCell('INTEGER', 1500), createDataCell('FK, NOT NULL', 2000), createDataCell('关联老人', 5000)] }),
          new TableRow({ children: [createDataCell('type', 2500), createDataCell('TEXT', 1500), createDataCell('NOT NULL', 2000), createDataCell('告警类型', 5000)] }),
          new TableRow({ children: [createDataCell('level', 2500), createDataCell('TEXT', 1500), createDataCell('NOT NULL', 2000), createDataCell('告警级别(P0/P1/P2)', 5000)] }),
          new TableRow({ children: [createDataCell('status', 2500), createDataCell('TEXT', 1500), createDataCell('NOT NULL', 2000), createDataCell('处理状态', 5000)] }),
          new TableRow({ children: [createDataCell('handler_id', 2500), createDataCell('INTEGER', 1500), createDataCell('FK', 2000), createDataCell('处理人', 5000)] }),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('4.2.3 服务工单表 (service_order)')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2500, 1500, 2000, 5000],
        rows: [
          new TableRow({ children: [createCell('字段名', 2500, true), createCell('类型', 1500, true), createCell('约束', 2000, true), createCell('说明', 5000, true)] }),
          new TableRow({ children: [createDataCell('id', 2500), createDataCell('INTEGER', 1500), createDataCell('PK', 2000), createDataCell('工单ID', 5000)] }),
          new TableRow({ children: [createDataCell('elderly_id', 2500), createDataCell('INTEGER', 1500), createDataCell('FK, NOT NULL', 2000), createDataCell('服务老人', 5000)] }),
          new TableRow({ children: [createDataCell('type', 2500), createDataCell('TEXT', 1500), createDataCell('NOT NULL', 2000), createDataCell('服务类型', 5000)] }),
          new TableRow({ children: [createDataCell('priority', 2500), createDataCell('TEXT', 1500), createDataCell('DEFAULT NORMAL', 2000), createDataCell('优先级', 5000)] }),
          new TableRow({ children: [createDataCell('status', 2500), createDataCell('TEXT', 1500), createDataCell('NOT NULL', 2000), createDataCell('工单状态', 5000)] }),
          new TableRow({ children: [createDataCell('provider_id', 2500), createDataCell('INTEGER', 1500), createDataCell('FK', 2000), createDataCell('服务商', 5000)] }),
        ]
      }),

      // 分页
      new Paragraph({ children: [new PageBreak()] }),

      // ========== 5. 业务流程设计 ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('5. 业务流程设计')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.1 告警处理流程')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '告警处理流程涵盖告警产生、分级、接单、处置、确认、关闭等完整生命周期。', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      // 插入告警流程图
      images.alertFlow ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new ImageRun({
          type: 'jpg',
          data: images.alertFlow,
          transformation: { width: 600, height: 340 },
          altText: { title: '告警处理流程图', description: '告警审批流程', name: 'alert-flow' }
        })]
      }) : new Paragraph({ children: [new TextRun('【告警处理流程图】')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.2 工单服务流程')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '工单服务流程包括创建、派单、接单、服务、评价等环节，形成服务闭环。', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      // 插入工单流程图
      images.orderFlow ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new ImageRun({
          type: 'jpg',
          data: images.orderFlow,
          transformation: { width: 600, height: 340 },
          altText: { title: '工单服务流程图', description: '工单流转流程', name: 'order-flow' }
        })]
      }) : new Paragraph({ children: [new TextRun('【工单服务流程图】')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.3 审批中心流程')] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: '审批中心处理家属绑定和设备绑定两类审批申请，确保关联关系的合规性。', font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont }, size: 22 })] }),

      // 插入审批流程图
      images.approvalFlow ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new ImageRun({
          type: 'jpg',
          data: images.approvalFlow,
          transformation: { width: 600, height: 340 },
          altText: { title: '审批中心流程图', description: '审批流程', name: 'approval-flow' }
        })]
      }) : new Paragraph({ children: [new TextRun('【审批中心流程图】')] }),

      // 分页
      new Paragraph({ children: [new PageBreak()] }),

      // ========== 6. 角色权限设计 ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('6. 角色权限设计')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('6.1 权限矩阵')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [3000, 1500, 1500, 1500, 1500, 2000],
        rows: [
          new TableRow({ children: [createCell('功能', 3000, true), createCell('政府', 1500, true), createCell('村级', 1500, true), createCell('服务商', 1500, true), createCell('家属', 1500, true), createCell('老人', 2000, true)] }),
          new TableRow({ children: [createDataCell('数据总览', 3000), createDataCell('查看', 1500), createDataCell('查看', 1500), createDataCell('查看', 1500), createDataCell('-', 1500), createDataCell('-', 2000)] }),
          new TableRow({ children: [createDataCell('老人管理', 3000), createDataCell('管理', 1500), createDataCell('管理', 1500), createDataCell('-', 1500), createDataCell('查看', 1500), createDataCell('查看', 2000)] }),
          new TableRow({ children: [createDataCell('告警处置', 3000), createDataCell('管理', 1500), createDataCell('处置', 1500), createDataCell('-', 1500), createDataCell('确认', 1500), createDataCell('求助', 2000)] }),
          new TableRow({ children: [createDataCell('工单管理', 3000), createDataCell('管理', 1500), createDataCell('派单', 1500), createDataCell('接单', 1500), createDataCell('预约', 1500), createDataCell('请求', 2000)] }),
          new TableRow({ children: [createDataCell('审批管理', 3000), createDataCell('审批', 1500), createDataCell('审批', 1500), createDataCell('-', 1500), createDataCell('申请', 1500), createDataCell('-', 2000)] }),
          new TableRow({ children: [createDataCell('服务评价', 3000), createDataCell('查看', 1500), createDataCell('查看', 1500), createDataCell('查看', 1500), createDataCell('评价', 1500), createDataCell('-', 2000)] }),
          new TableRow({ children: [createDataCell('用户管理', 3000), createDataCell('管理', 1500), createDataCell('查看', 1500), createDataCell('-', 1500), createDataCell('-', 1500), createDataCell('-', 2000)] }),
        ]
      }),

      // 分页
      new Paragraph({ children: [new PageBreak()] }),

      // ========== 7. API接口设计 ==========
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('7. API接口设计')] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('7.1 告警审批流程API')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2500, 1500, 7000],
        rows: [
          new TableRow({ children: [createCell('接口', 2500, true), createCell('方法', 1500, true), createCell('说明', 7000, true)] }),
          new TableRow({ children: [createDataCell('/api/alerts', 2500), createDataCell('GET', 1500), createDataCell('获取告警列表，支持分页、状态、类型筛选', 7000)] }),
          new TableRow({ children: [createDataCell('/api/alerts/:id/accept', 2500), createDataCell('POST', 1500), createDataCell('接单告警', 7000)] }),
          new TableRow({ children: [createDataCell('/api/alerts/:id/process', 2500), createDataCell('PUT', 1500), createDataCell('处置完成，支持是否需要家属确认', 7000)] }),
          new TableRow({ children: [createDataCell('/api/alerts/:id/confirm', 2500), createDataCell('PUT', 1500), createDataCell('家属确认通过或申诉', 7000)] }),
          new TableRow({ children: [createDataCell('/api/alerts/:id/escalate', 2500), createDataCell('PUT', 1500), createDataCell('升级告警', 7000)] }),
          new TableRow({ children: [createDataCell('/api/alerts/:id/flow-records', 2500), createDataCell('GET', 1500), createDataCell('获取流转记录', 7000)] }),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('7.2 工单流转API')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2500, 1500, 7000],
        rows: [
          new TableRow({ children: [createCell('接口', 2500, true), createCell('方法', 1500, true), createCell('说明', 7000, true)] }),
          new TableRow({ children: [createDataCell('/api/orders', 2500), createDataCell('GET', 1500), createDataCell('获取工单列表', 7000)] }),
          new TableRow({ children: [createDataCell('/api/orders', 2500), createDataCell('POST', 1500), createDataCell('创建工单', 7000)] }),
          new TableRow({ children: [createDataCell('/api/orders/:id/assign', 2500), createDataCell('POST', 1500), createDataCell('派单，支持手动/自动模式', 7000)] }),
          new TableRow({ children: [createDataCell('/api/orders/:id/accept', 2500), createDataCell('POST', 1500), createDataCell('服务商接单', 7000)] }),
          new TableRow({ children: [createDataCell('/api/orders/:id/reject', 2500), createDataCell('POST', 1500), createDataCell('服务商拒单', 7000)] }),
          new TableRow({ children: [createDataCell('/api/orders/:id/complete', 2500), createDataCell('POST', 1500), createDataCell('完成服务', 7000)] }),
          new TableRow({ children: [createDataCell('/api/orders/:id/review', 2500), createDataCell('POST', 1500), createDataCell('家属评价', 7000)] }),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('7.3 审批中心API')] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [3000, 1500, 6500],
        rows: [
          new TableRow({ children: [createCell('接口', 3000, true), createCell('方法', 1500, true), createCell('说明', 6500, true)] }),
          new TableRow({ children: [createDataCell('/api/approvals/family-binding', 3000), createDataCell('GET/POST', 1500), createDataCell('获取/提交家属绑定申请', 6500)] }),
          new TableRow({ children: [createDataCell('/api/approvals/family-binding/:id/approve', 3000), createDataCell('PUT', 1500), createDataCell('审批家属绑定申请', 6500)] }),
          new TableRow({ children: [createDataCell('/api/approvals/device-binding', 3000), createDataCell('GET/POST', 1500), createDataCell('获取/提交设备绑定申请', 6500)] }),
          new TableRow({ children: [createDataCell('/api/approvals/device-binding/:id/approve', 3000), createDataCell('PUT', 1500), createDataCell('审批设备绑定申请', 6500)] }),
          new TableRow({ children: [createDataCell('/api/approvals/pending-count', 3000), createDataCell('GET', 1500), createDataCell('获取待审批数量', 6500)] }),
        ]
      }),

      // 文档结束
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: '— 文档结束 —',
          font: { ascii: asciiFont, hAnsi: asciiFont, eastAsia: cjkFont },
          size: 24,
          color: '999999'
        })]
      }),
    ]
  }]
});

// 生成文档
const outputDir = 'C:\\Users\\50453\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\work-mode-projects\\69fc53401951d9944a8d5d16';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, '乡村守护者智慧养老平台_需求设计说明书_V3.0.docx');
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Document created:', outputPath);
}).catch(err => {
  console.error('Error:', err);
});
