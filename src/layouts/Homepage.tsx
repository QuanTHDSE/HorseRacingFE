import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Crown, Eye, Flag, Gauge, Landmark, Radio, Trophy, Users, Wrench, type LucideIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { roleConfigs } from "../config/roleConfigs";
import { cn } from "../utils/cn";
import { useReveal } from "../utils/useReveal";
import type { Role } from "../types";

const HERO_VIDEO_URL =
  "https://videos.pexels.com/video-files/35714955/15136455_1920_1080_30fps.mp4";

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Landmark,
    title: "Thiết lập giải đấu & cuộc đua",
    desc: "Tạo giải đấu, cấu hình đường đua và quản lý toàn bộ lịch đua từ đầu đến cuối.",
  },
  {
    icon: Users,
    title: "Quản lý ngựa & nài ngựa",
    desc: "Đăng ký ngựa, phân công nài, theo dõi hồ sơ thi đấu và thống kê thành tích.",
  },
  {
    icon: Radio,
    title: "Điều hành đua trực tiếp",
    desc: "Bảng điều khiển thời gian thực cho trọng tài, ghi nhận vi phạm và cảnh báo tức thì.",
  },
  {
    icon: Trophy,
    title: "Kết quả & Dự đoán",
    desc: "Công bố kết quả chính thức, trao thưởng và thu hút khán giả bằng dự đoán trực tiếp.",
  },
];

const ROLE_ICONS: Record<Role, LucideIcon> = {
  owner: Crown,
  jockey: Gauge,
  referee: Flag,
  spectator: Eye,
  admin: Wrench,
};

const ROLE_ORDER: Role[] = ["owner", "jockey", "referee", "spectator"];

const STEPS = [
  {
    title: "Tạo tài khoản",
    desc: "Đăng ký miễn phí và chọn vai trò phù hợp với bạn trong hệ sinh thái đua ngựa.",
  },
  {
    title: "Tham gia giải đấu",
    desc: "Quản lý ngựa, nhận lời mời thi đấu hoặc theo dõi lịch đua sắp diễn ra.",
  },
  {
    title: "Trải nghiệm trực tiếp",
    desc: "Theo dõi cuộc đua theo thời gian thực, dự đoán kết quả và nhận thưởng ngay khi chung cuộc.",
  },
];

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function FeatureCard({ feature, delay }: { feature: (typeof FEATURES)[number]; delay: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", visible && "is-visible")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="home-feature-card">
        <span className="home-feature-icon"><feature.icon size={24} strokeWidth={2} /></span>
        <h3>{feature.title}</h3>
        <p>{feature.desc}</p>
      </div>
    </div>
  );
}

function RoleCard({ role, delay }: { role: Role; delay: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const cfg = roleConfigs[role];
  const RoleIcon = ROLE_ICONS[role];
  return (
    <div
      ref={ref}
      className={cn("reveal", visible && "is-visible")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Link to="/login" className="home-role-card">
        <span className="home-role-icon"><RoleIcon size={22} strokeWidth={2} /></span>
        <strong>{cfg.label}</strong>
        <p>{cfg.accent}</p>
        <span className="home-role-cta">Truy cập khu làm việc →</span>
      </Link>
    </div>
  );
}

function StepCard({ step, index, delay }: { step: (typeof STEPS)[number]; index: number; delay: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("home-step reveal", visible && "is-visible")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="home-step-num">{String(index + 1).padStart(2, "0")}</span>
      <h3>{step.title}</h3>
      <p>{step.desc}</p>
    </div>
  );
}

export default function Homepage() {
  const { user } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.7);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="home-page">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className={cn("home-nav", scrolled && "is-scrolled")}>
        <div className="home-nav-brand">
          <div className="brand-mark">RT</div>
          <span className="home-nav-brand-name">RacetrackVN</span>
        </div>
        <nav className="home-nav-links">
          <a className="home-nav-link" href="#features">Tính năng</a>
          <a className="home-nav-link" href="#roles">Vai trò</a>
          <a className="home-nav-link" href="#steps">Quy trình</a>
        </nav>
        <div className="home-nav-actions">
          {user ? (
            <Link className="primary-button" to="/dashboard">Vào khu làm việc →</Link>
          ) : (
            <>
              <Link className="ghost-button" to="/login">Đăng nhập</Link>
              <Link className="primary-button" to="/login">Đăng ký</Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero — cinematic race video ────────────────────────── */}
      <section className="home-hero">
        <video
          className="home-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
        <div className="home-hero-overlay" />

        <div className="home-hero-content">
          <h1>Cảm nhận trọn vẹn tốc độ<br />Kịch tính từng <em>vòng đua</em></h1>
          <p>
            RacetrackVN kết nối chủ ngựa, nài ngựa, trọng tài và khán giả trên một nền tảng số
            duy nhất — từ thiết lập giải đấu, điều hành trực tiếp đến công bố kết quả và dự đoán.
          </p>
          <div className="home-hero-actions">
            <Link className="primary-button" to="/login">Bắt đầu ngay →</Link>
            <a className="ghost-button" href="#features">Khám phá tính năng</a>
          </div>
        </div>

        <div className="home-scroll-cue" aria-hidden="true">
          <span>Cuộn để khám phá</span>
          <span>↓</span>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="home-section">
        <Reveal className="home-section-head">
          <span className="kicker">Tại sao chọn RacetrackVN</span>
          <h2>Một nền tảng, trọn vẹn hành trình đua ngựa</h2>
          <p>Mọi công cụ cần thiết cho từng vai trò trong hệ sinh thái đua ngựa, gói gọn trong một trải nghiệm liền mạch.</p>
        </Reveal>
        <div className="home-feature-grid">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delay={i * 90} />
          ))}
        </div>
      </section>

      {/* ── Roles ───────────────────────────────────────────────── */}
      <section id="roles" className="home-section home-roles">
        <Reveal className="home-section-head">
          <span className="kicker">Dành cho mọi vai trò</span>
          <h2>Khu làm việc riêng cho từng vai trò</h2>
          <p>Mỗi tài khoản có một không gian làm việc được thiết kế riêng, đúng nhu cầu và quyền hạn.</p>
        </Reveal>
        <div className="home-role-grid">
          {ROLE_ORDER.map((role, i) => (
            <RoleCard key={role} role={role} delay={i * 90} />
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="steps" className="home-section">
        <Reveal className="home-section-head">
          <span className="kicker">Bắt đầu chỉ trong 3 bước</span>
          <h2>Sẵn sàng nhập cuộc</h2>
        </Reveal>
        <div className="home-steps-grid">
          {STEPS.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} delay={i * 110} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <Reveal className="home-cta-banner">
        <div>
          <h2>Sẵn sàng bước vào đường đua?</h2>
          <p>Tạo tài khoản miễn phí ngay hôm nay và trải nghiệm nền tảng quản lý đua ngựa toàn diện nhất.</p>
        </div>
        <Link className="primary-button" to="/login">Tạo tài khoản miễn phí →</Link>
      </Reveal>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="home-footer">
        <div className="home-footer-brand">
          <div className="brand-mark">RT</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "var(--c-inv-on)" }}>RacetrackVN</p>
            <p style={{ margin: "2px 0 0" }}>© 2026 RacetrackVN · Bảo lưu mọi quyền</p>
          </div>
        </div>
        <div className="home-footer-links">
          <Link to="/login">Đăng nhập</Link>
          <Link to="/login">Đăng ký</Link>
          <a href="#features">Tính năng</a>
        </div>
      </footer>
    </div>
  );
}
