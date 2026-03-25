# ImpactPlay: Premium Golf Charity Platform

ImpactPlay is a high-end, modern subscription platform designed to bridge the gap between competitive golf scoring and meaningful social impact. Built with a "Luminous Impact" design system, it looks and feels like a premium fintech product while driving consistent contributions to global charities.

## ✨ Core Features

### 🏆 Gamified Charity Draws
*   **Monthly Tiered Draws:** Automated prize distribution across three tiers (3-match, 4-match, and 5-match jackpots).
*   **Intelligent Win Logic:** Supports both pure **Random** and **Weighted** draw modes (where popular numbers among participants are more likely to be drawn).
*   **Rollover Mechanics:** Unclaimed jackpots automatically roll over to the next month, increasing the stakes and engagement.

### 🛡️ Premium Member Experience
*   **Asymmetric Dashboard:** A dynamic, non-grid layout featuring high-end glassmorphism and subtle motion.
*   **Centerpiece Score Entry:** A large, focused interface for logging Stableford scores with immediate history feedback.
*   **Impact Direction:** Members can choose which partner charity receives their generated impact and set their preferred contribution percentage.
*   **Role-Based Badges:** Persistent identity feedback (ADMIN / PREMIUM / MEMBER) in the global header.

### 📊 Advanced Administrative Suite
*   **Real-time Analytics:** Track platform growth, total impact, and financial health.
*   **Secure User Management:** Role escalation (Admin promotion) and secure profile viewing.
*   **Draw Orchestration:** Full control over draw creation, simulation (predictive results), and official publication.
*   **Winner Verification:** Robust queue for reviewing winner proof (PDFs) and managing payouts.

## 🛠️ Technology Stack

*   **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with a custom tokenized design system.
*   **Animations:** [Framer Motion](https://www.framer.com/motion/) for fluid micro-interactions and transitions.
*   **Backend:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, Storage, Real-time).
*   **Payments:** [LemonSqueezy](https://www.lemonsqueezy.com/) for subscription management and license synchronization.
*   **Icons:** [Lucide React](https://lucide.dev/).

## 🚀 Getting Started

### Prerequisites
*   Node.js 20+ 
*   Supabase Account
*   LemonSqueezy API Key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/RakeshKhadav/Impact-Play-Platform.git
    cd impact-play-platform
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root directory and add the following:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    LEMON_SQUEEZY_API_KEY=your_ls_api_key
    LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) to view the platform.

## 📐 Design System

The platform follows the **Luminous Impact** design system:
*   **Primary Action:** Power Blue (`#2563EB`)
*   **Charity Impact:** Teal (`#0D9488`)
*   **Rewards/Wins:** Impact Orange (`#EA580C`)
*   **Atmosphere:** Deep Navy (`#0B0F1A`) with glassmorphic layers and blurred ambient glows.

## ⚖️ License
This project is private and proprietary.
