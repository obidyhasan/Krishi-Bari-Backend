# Krishi Bari Backend API

Production-ready Express + TypeScript + Prisma backend for the Krishi Bari e-commerce platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| ORM | Prisma (PostgreSQL) |
| Auth | JWT (access + refresh tokens) |
| Media | Cloudinary |
| Payments | bKash Tokenized Checkout |
| Real-time | Socket.io |
| Email | Nodemailer |
| Validation | Zod |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in all required values
```

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start development server

```bash
npm run dev
```

Server runs at `http://localhost:5000`

---

## API Base URL

```
http://localhost:5000/api/v1
```

## API Modules

| Prefix | Description |
|---|---|
| `/auth` | Register, login, OTP verify, refresh token, password reset |
| `/users` | Profile, avatar upload, admin user management |
| `/categories` | Nested category CRUD with Cloudinary images |
| `/products` | Product CRUD, multi-image upload, search & filter |
| `/cart` | Add/update/remove items, stock validation |
| `/orders` | Place orders, track status, admin order management |
| `/payments` | bKash tokenized checkout, COD |
| `/reviews` | Product reviews and ratings |
| `/coupons` | Coupon CRUD, validation, discount calculation |
| `/wishlist` | Toggle/list/remove wishlist items |
| `/notifications` | In-app notifications, read/unread management |
| `/addresses` | Address book (up to 5), default address |
| `/admin` | Dashboard stats, sales reports |

---

## Authentication

All protected routes require:

```
Authorization: Bearer <access_token>
```

**Token expiry:**
- Access token: 15 minutes
- Refresh token: 30 days

**Roles:** `CUSTOMER`, `ADMIN`, `SUPER_ADMIN`

---

## Real-time Order Tracking (Socket.io)

Connect to the Socket.io server, then:

```js
// Join an order room to receive status updates
socket.emit("join:order", orderId);

// Listen for status updates
socket.on("order:status", ({ orderId, status, message }) => {
  console.log(`Order ${orderId} is now ${status}`);
});
```

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | JWT signing secret (access token) |
| `JWT_REFRESH_SECRET` | JWT signing secret (refresh token) |
| `CLOUDINARY_*` | Cloudinary cloud name, API key, secret |
| `BKASH_*` | bKash merchant credentials |
| `EMAIL_*` | SMTP config for Nodemailer |

---

## Scripts

```bash
npm run dev          # Development server (ts-node-dev)
npm run build        # Compile TypeScript
npm run start        # Production server
npm run db:migrate   # Run Prisma migrations
npm run db:push      # Push schema without migration
npm run db:studio    # Open Prisma Studio
```

---

## Project Structure

```
src/
├── app/
│   ├── config/         # Environment config
│   ├── constants/      # Enums, status maps
│   ├── errors/         # ApiError class
│   ├── helper/         # JWT, email, OTP, Cloudinary, order helpers
│   ├── middlewares/    # Auth, validation, error handler, notFound
│   ├── modules/        # 13 feature modules
│   │   ├── auth/
│   │   ├── user/
│   │   ├── category/
│   │   ├── product/
│   │   ├── cart/
│   │   ├── order/
│   │   ├── payment/
│   │   ├── review/
│   │   ├── coupon/
│   │   ├── wishlist/
│   │   ├── notification/
│   │   ├── address/
│   │   └── admin/
│   ├── routers/        # Route aggregator
│   ├── shared/         # Prisma, catchAsync, sendResponse, pick
│   └── types/          # JWT payload type extension
├── app.ts              # Express app
└── server.ts           # HTTP + Socket.io bootstrap
prisma/
└── schema/
    └── schema.prisma   # Full data model (15 entities)
```
