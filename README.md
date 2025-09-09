# 🎯 Workshop Tracker - ระบบจัดการงานสัมมนาและเวิร์กช็อป

> ระบบจัดการงานสัมมนาและเวิร์กช็อปแบบครบวงจร สร้างสำหรับมหาวิทยาลัยเชียงใหม่ พัฒนาด้วย React, TypeScript และ Supabase

[![Vercel Deploy](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/neckttiie090520/tracco-tracker)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

## 📋 ภาพรวมของระบบ

Workshop Tracker เป็นแพลตฟอร์มจัดการงานสัมมนาและเวิร์กช็อปแบบดิจิทัล ที่ออกแบบมาเพื่อให้การจัดการงานสัมมนาเป็นไปอย่างมีประสิทธิภาพ ตั้งแต่การลงทะเบียน การติดตามความคืบหน้า ไปจนถึงการประเมินผล

### 🎯 วัตถุประสงค์

- **จัดการงานสัมมนา** แบบครบวงจรผ่านระบบดิจิทัล
- **อำนวยความสะดวก** ให้ผู้เข้าร่วมในการลงทะเบียนและส่งงาน
- **ติดตามความคืบหน้า** แบบเรียลไทม์
- **สร้างประสบการณ์การเรียนรู้** ที่มีประสิทธิภาพและน่าสนใจ

## 👥 กลุ่มผู้ใช้

### 🎓 ผู้เข้าร่วม (Participants)
- **นักศึกษา** - ลงทะเบียนเข้าร่วมเวิร์กช็อป
- **อาจารย์และบุคลากร** - ร่วมพัฒนาทักษะ
- **บุคคลทั่วไป** - เข้าร่วมเวิร์กช็อปสาธารณะ

**ความสามารถ:**
- ลงทะเบียนเข้าร่วมงานสัมมนา
- ส่งงานและติดตามความคืบหน้า
- ดูประวัติการเข้าร่วมทั้งหมด
- รับการแจ้งเตือนอัตโนมัติ

### 👨‍💼 ผู้ดูแลระบบ (Administrators)
- **ผู้จัดงานสัมมนา** - สร้างและจัดการเนื้อหา
- **อาจารย์ผู้สอน** - ติดตามและประเมินผู้เข้าร่วม
- **เจ้าหน้าที่** - จัดการระบบและสร้างรายงาน

**ความสามารถ:**
- สร้างและจัดการงานสัมมนา/เวิร์กช็อป
- ติดตามการส่งงานและให้คะแนน
- ส่งอีเมลแจ้งเตือนและการสื่อสาร
- วิเคราะห์ข้อมูลและสร้างรายงาน

## 🏗️ สถาปัตยกรรมระบบ

### Frontend Stack
```
React 18 + TypeScript
├── Vite (Build Tool)
├── Tailwind CSS (Styling)
├── Framer Motion (Animations)
├── React Router (Routing)
└── React Query (State Management)
```

### Backend & Infrastructure
```
Supabase (Backend-as-a-Service)
├── PostgreSQL (Database)
├── Row Level Security (RLS)
├── Real-time Subscriptions
├── Authentication (Google OAuth)
└── Storage (File Management)
```

### Deployment
```
Vercel (Frontend Hosting)
├── Automatic Deployments
├── Environment Variables
├── SPA Routing
└── Edge Functions
```

## 🎯 ฟีเจอร์หลัก

### 🔐 ระบบการเข้าสู่ระบบ
- **Google OAuth 2.0** - เข้าสู่ระบบด้วย Google Account
- **โปรไฟล์ที่กำหนดเอง** - จัดการข้อมูลส่วนบุคคล
- **ระบบบทบาท** - แยกสิทธิ์ผู้ใช้และผู้ดูแล

### 📚 ระบบจัดการงานสัมมนา (Session Management)
- **สร้างงานสัมมนา** - กำหนดวันที่, เวลา, จำนวนผู้เข้าร่วม
- **ระบบลงทะเบียน** - ลงทะเบียนเข้าร่วมอัตโนมัติ
- **การติดตามการเข้าร่วม** - Check-in และสถิติการเข้าร่วม

### 🎯 ระบบจัดการเวิร์กช็อป (Workshop Management)
- **สร้างเวิร์กช็อป** - เนื้อหา, วัสดุการเรียน, งานที่มอบหมาย
- **Google Docs Integration** - ฝังเอกสารโดยตรง
- **ระบบจัดการวัสดุ** - อัปโหลดและแชร์ไฟล์

### 📝 ระบบงานและการส่งงาน
- **การมอบหมายงาน** - สร้างงานพร้อมกำหนดส่ง
- **การส่งงานหลายรูปแบบ** - ไฟล์, URL, ข้อความ
- **ระบบ Draft** - บันทึกงานก่อนส่ง
- **การให้คะแนนและฟีดแบ็ก** - ประเมินผลและแสดงความคิดเห็น

### 📊 ระบบวิเคราะห์และรายงาน
- **แดชบอร์ดแบบเรียลไทม์** - ติดตามความคืบหน้าทันที
- **สถิติการเข้าร่วม** - อัตราการมาเรียน, การส่งงาน
- **ระบบคะแนน** - Leaderboard และ Gamification
- **ส่งออกข้อมูล** - CSV, PDF Reports

### 🛠️ เครื่องมือผู้ดูแลขั้นสูง
- **Random Name Picker** - สุ่มเลือกผู้เข้าร่วม (สไตล์ Slot Machine)
- **การจัดการแบบกลุ่ม** - แก้ไข/ลบข้อมูลหลายรายการ
- **ส่งอีเมลรวม** - แจ้งเตือนผู้เข้าร่วมทั้งหมด
- **ระบบกรองและค้นหา** - จัดการข้อมูลอย่างมีประสิทธิภาพ

## 📱 ฟีเจอร์พิเศษ

### 🎮 Gamification
- **ระบบคะแนน** - สะสมคะแนนจากการเข้าร่วม
- **Achievement System** - รางวัลสำหรับความสำเร็จ
- **Leaderboard** - จัดอันดับผู้เข้าร่วม

### 🔔 ระบบการแจ้งเตือน
- **อีเมลอัตโนมัติ** - แจ้งเตือนกำหนดส่งงาน
- **การแจ้งเตือนในแอป** - อัปเดตแบบเรียลไทม์
- **การประกาศ** - ข่าวสารและประกาศจากผู้จัด

### 🎨 ประสบการณ์ผู้ใช้
- **Responsive Design** - ใช้งานได้ทุกอุปกรณ์
- **ภาษาไทยเต็มรูปแบบ** - รองรับการแสดงผลภาษาไทย
- **Vanta.js Animations** - พื้นหลังเคลื่อนไหวสวยงาม
- **Glassmorphism UI** - ดีไซน์ทันสมัย

## 🚀 การติดตั้งและใช้งาน

### ความต้องการของระบบ
```bash
Node.js >= 18.0.0
npm >= 9.0.0
Git
```

### การติดตั้ง
```bash
# Clone repository
git clone https://github.com/neckttiie090520/tracco-tracker.git
cd workshop-tracker

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment variables
cp .env.example .env.local
# แก้ไขค่าใน .env.local

# รันในโหมด development
npm run dev
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### การ Deploy
```bash
# Build สำหรับ production
npm run build

# Deploy ไปยัง Vercel
npm run deploy
```

## 📊 Database Schema

### ตารางหลัก

#### `users` - ข้อมูลผู้ใช้
```sql
id: UUID (Primary Key)
email: VARCHAR
full_name: VARCHAR
avatar_url: VARCHAR
role: ENUM('admin', 'participant')
faculty: VARCHAR
department: VARCHAR
organization: VARCHAR
```

#### `sessions` - งานสัมมนา
```sql
id: UUID (Primary Key)
title: VARCHAR
description: TEXT
start_date: TIMESTAMP
end_date: TIMESTAMP
max_participants: INTEGER
is_active: BOOLEAN
```

#### `workshops` - เวิร์กช็อป
```sql
id: UUID (Primary Key)
session_id: UUID (Foreign Key)
title: VARCHAR
description: TEXT
instructor: VARCHAR
google_docs_url: VARCHAR
```

#### `tasks` - งานที่มอบหมาย
```sql
id: UUID (Primary Key)
workshop_id: UUID (Foreign Key)
title: VARCHAR
description: TEXT
due_date: TIMESTAMP
order: INTEGER
```

#### `submissions` - การส่งงาน
```sql
id: UUID (Primary Key)
task_id: UUID (Foreign Key)
user_id: UUID (Foreign Key)
content: TEXT
file_url: VARCHAR
status: ENUM('draft', 'submitted', 'reviewed')
score: INTEGER
feedback: TEXT
```

## 🔧 การพัฒนา

### โครงสร้างโฟลเดอร์
```
src/
├── components/           # React Components
│   ├── admin/           # ส่วนผู้ดูแลระบบ
│   ├── user/            # ส่วนผู้ใช้ทั่วไป  
│   ├── workshops/       # ส่วนเวิร์กช็อป
│   ├── common/          # ส่วนที่ใช้ร่วมกัน
│   └── ui/              # UI Components พื้นฐาน
├── pages/               # หน้าเว็บหลัก
├── services/            # API และ Business Logic
├── hooks/               # Custom React Hooks
├── types/               # TypeScript Type Definitions
└── utils/               # Utility Functions
```

### คำสั่งที่สำคัญ
```bash
# Development
npm run dev              # รันในโหมดพัฒนา
npm run build            # Build สำหรับ production
npm run preview          # ดูตัวอย่าง production build

# Code Quality
npm run lint             # ตรวจสอบ code style
npm run type-check       # ตรวจสอบ TypeScript types

# Database
npm run db:reset         # รีเซ็ต database (development)
npm run db:seed          # เพิ่มข้อมูลตัวอย่าง
```

## 🛡️ ความปลอดภัย

### การรักษาความปลอดภัยข้อมูล
- **Row Level Security (RLS)** - ควบคุมการเข้าถึงข้อมูลระดับแถว
- **Input Sanitization** - ป้องกัน SQL Injection และ XSS
- **JWT Authentication** - การยืนยันตัวตนที่ปลอดภัย
- **HTTPS Encryption** - เข้ารหัสการสื่อสารทั้งหมด

### การจัดการสิทธิ์
- **Role-based Access Control** - แยกสิทธิ์ตามบทบาท
- **Permission Levels** - ควบคุมการเข้าถึงฟีเจอร์
- **Audit Logging** - บันทึกการใช้งานสำคัญ

## 📈 Performance และ Optimization

### การปรับปรุงประสิทธิภาพ
- **Code Splitting** - แบ่งโค้ดเป็นส่วนๆ
- **Lazy Loading** - โหลดเฉพาะส่วนที่ใช้
- **Image Optimization** - บีบอัดและปรับขนาดรูปภาพ
- **Caching Strategy** - แคชข้อมูลที่เข้าถึงบ่อย

### การติดตามประสิทธิภาพ
- **Real-time Monitoring** - ติดตามระบบแบบเรียลไทม์
- **Error Tracking** - ติดตามและแก้ไขข้อผิดพลาด
- **Performance Metrics** - วัดประสิทธิภาพการทำงาน

## 🤝 การสนับสนุนและช่วยเหลือ

### การติดต่อ
- **Email**: support@workshop-tracker.edu
- **GitHub Issues**: [สร้าง Issue ใหม่](https://github.com/neckttiie090520/tracco-tracker/issues)
- **Documentation**: [คู่มือการใช้งาน](https://docs.workshop-tracker.edu)

### การร่วมพัฒนา
เรายินดีรับการสนับสนุนจากชุมชนนักพัฒนา! โปรดอ่าน [คู่มือการมีส่วนร่วม](CONTRIBUTING.md) ก่อนเริ่มต้น

## 📄 License

โครงการนี้ใช้สัญญาอนุญาต [MIT License](LICENSE) - ดูรายละเอียดในไฟล์ LICENSE

## 🙏 กิตติกรรมประกาศ

ขอขอบคุณทุกท่านที่มีส่วนร่วมในการพัฒนาโครงการนี้:

- **มหาวิทยาลัยเชียงใหม่** - สำหรับการสนับสนุนและข้อมูลความต้องการ
- **ทีมพัฒนา** - สำหรับการออกแบบและพัฒนาระบบ
- **ชุมชนผู้ใช้** - สำหรับการทดสอบและข้อเสนอแนะ

---

<div align="center">

**🎯 Workshop Tracker - ระบบจัดการงานสัมมนาที่ครบครัน**

Made with ❤️ for Chiang Mai University

[🌐 เว็บไซต์](https://traco-tracker.vercel.app) | [📚 เอกสาร](https://docs.workshop-tracker.edu) | [🐛 รายงานปัญหา](https://github.com/neckttiie090520/tracco-tracker/issues)

</div>