# 🚀 LibertaPhonix Order Management System

A modern, ultra-responsive order management system built with Next.js 14, TypeScript, and PostgreSQL. Features a beautiful glassmorphism UI design with complete bilingual support (French/English).

![LibertaPhonix](https://img.shields.io/badge/LibertaPhonix-Order%20Management-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)

## ✨ Features

### 🎨 **Ultra Modern UI/UX**
- **Glassmorphism Design** - Beautiful backdrop blur effects and modern aesthetics
- **Collapsible Sidebar** - Smooth animations with responsive behavior
- **Modern Language Switcher** - Dropdown with flags (🇫🇷/🇺🇸) in navbar
- **Fully Responsive** - Mobile-first design that works on all devices
- **Dark/Light Theme Ready** - Prepared for theme switching

### 👥 **User Management**
- **Complete CRUD Operations** - Create, read, update, delete users
- **Role-based Access Control** - Admin, Team Manager, Agents
- **Admin Protection** - Admins cannot be deactivated or deleted
- **Real-time Status Updates** - Live user availability tracking
- **Agent Code Generation** - Automatic code assignment

### 🔔 **Toast Notification System**
- **4 Notification Types** - Success, Error, Warning, Info
- **Auto-dismiss** - 5-second timer with smooth animations
- **Bottom-right Positioning** - Non-intrusive notifications
- **Bilingual Messages** - FR/EN support

### 📄 **Advanced Pagination**
- **Smart Navigation** - Page numbers with ellipsis
- **Configurable Items** - 10/25/50/100 per page (default: 25)
- **Responsive Design** - Perfect mobile/desktop experience
- **Reusable Component** - Works across all tables

### 🌐 **Internationalization**
- **Complete Bilingual Support** - French and English
- **Dynamic Content Translation** - All UI elements translate
- **Context-based Language Management** - Centralized language state

## 🏗️ **Tech Stack**

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Modern icon library
- **React Context** - State management

### **Backend**
- **Express.js** - Node.js web framework
- **Prisma ORM** - Type-safe database operations
- **PostgreSQL** - Production-ready database
- **Redis** - Caching and session management
- **JWT** - Secure authentication

### **DevOps**
- **Docker** - Containerized development and deployment
- **Docker Compose** - Multi-service orchestration
- **TypeScript** - Full-stack type safety

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- Docker & Docker Compose
- Git

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/sraidytech/liberta_Management.git
cd liberta_Management
```

2. **Start with Docker Compose**
```bash
docker-compose up -d
```

3. **Access the application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Prisma Studio**: http://localhost:5555

### **Default Admin Credentials**
- **Email**: contact@libertaphoenix.com
- **Password**: 123456789

## 📁 **Project Structure**

```
liberta_Management/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable components
│   │   │   ├── admin/       # Admin-specific components
│   │   │   └── ui/          # UI components (toast, pagination)
│   │   └── lib/             # Utilities and contexts
├── backend/                 # Express.js backend API
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Authentication
│   │   │   └── users/       # User management
│   │   ├── middleware/      # Custom middleware
│   │   ├── config/          # Configuration files
│   │   └── utils/           # Utility functions
│   └── prisma/              # Database schema and migrations
└── docker-compose.yml       # Multi-service setup
```

## 🔧 **Development**

### **Environment Variables**

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:password@postgres:5432/libertaphonix"
REDIS_URL="redis://redis:6379"
JWT_SECRET="your-super-secret-jwt-key"
```

### **Available Scripts**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild services
docker-compose up --build

# Access database
docker-compose exec postgres psql -U postgres -d libertaphonix
```

## 📊 **Database Schema**

### **User Model**
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  password      String
  role          Role     @default(AGENT_SUIVI)
  isActive      Boolean  @default(true)
  agentCode     String?  @unique
  maxOrders     Int      @default(50)
  currentOrders Int      @default(0)
  availability  Status   @default(OFFLINE)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## 🎯 **Current Features**

- ✅ **User Management System** - Complete CRUD with role-based access
- ✅ **Authentication & Authorization** - JWT-based security
- ✅ **Modern UI/UX** - Glassmorphism design with responsive layout
- ✅ **Toast Notifications** - Real-time user feedback
- ✅ **Pagination System** - Advanced table navigation
- ✅ **Bilingual Support** - French/English internationalization
- ✅ **Database Integration** - PostgreSQL with Prisma ORM

## 🚧 **Roadmap**

### **Phase 1: Core Business Features**
- [ ] Orders Management Dashboard
- [ ] Store Management System
- [ ] Order Assignment Logic
- [ ] Real-time Order Tracking

### **Phase 2: Advanced Features**
- [ ] EcoManager Integration
- [ ] Analytics & Reporting
- [ ] WebSocket Real-time Updates
- [ ] Mobile Application

### **Phase 3: Enterprise Features**
- [ ] Payment Gateway Integration
- [ ] Advanced Security Features
- [ ] API Documentation
- [ ] Performance Optimization

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 **Team**

- **Development Team**: SraidyTech
- **Project Lead**: LibertaPhonix Team

## 📞 **Support**

For support and questions:
- **Email**: contact@libertaphoenix.com
- **GitHub Issues**: [Create an issue](https://github.com/sraidytech/liberta_Management/issues)

---

**Built with ❤️ by SraidyTech for LibertaPhonix**