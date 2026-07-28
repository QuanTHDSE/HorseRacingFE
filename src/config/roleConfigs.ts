import type { Role, RoleConfig } from "../types";

export const roleConfigs: Record<Role, RoleConfig> = {
  owner: {
    label: "Chủ ngựa",
    accent: "Quản lý ngựa, xác nhận lịch đua và chọn nài ngựa",
    homeLabel: "Khu làm việc Chủ ngựa",
    menu: [
      { id: "dashboard", label: "Tổng quan", abbr: "TQ" },
      { id: "horses", label: "Ngựa của tôi", abbr: "NT" },
      { id: "jockeys", label: "Thuê nài ngựa", abbr: "TN" },
      { id: "schedule", label: "Lịch đua", abbr: "LĐ" },
      { id: "results", label: "Kết quả & Thưởng", abbr: "KT" },
      { id: "account", label: "Tài khoản của tôi", abbr: "CN" },
    ],
  },
  jockey: {
    label: "Nài ngựa",
    accent: "Nhận lời mời, quản lý các cuộc đua được giao và theo dõi thành tích",
    homeLabel: "Khu làm việc Nài ngựa",
    menu: [
      { id: "dashboard", label: "Tổng quan", abbr: "TQ" },
      { id: "invitations", label: "Lời mời", abbr: "LM" },
      { id: "assigned", label: "Cuộc đua được giao", abbr: "CĐ" },
      { id: "schedule", label: "Lịch của tôi", abbr: "LT" },
      { id: "performance", label: "Thành tích", abbr: "TT" },
      { id: "account", label: "Tài khoản của tôi", abbr: "CN" },
    ],
  },
  referee: {
    label: "Trọng tài",
    accent: "Kiểm tra trước đua và xác nhận kết quả cuộc đua",
    homeLabel: "Phòng điều hành Trọng tài",
    menu: [
      { id: "dashboard", label: "Tổng quan", abbr: "TQ" },
      { id: "checks", label: "Kiểm tra trước đua", abbr: "KT" },
      { id: "penalties", label: "Điều hành & Xử phạt", abbr: "XP" },
      { id: "results", label: "Kết quả", abbr: "KQ" },
      { id: "account", label: "Tài khoản của tôi", abbr: "CN" },
    ],
  },
  spectator: {
    label: "Khán giả",
    accent: "Theo dõi đua trực tiếp, dự đoán kết quả và nhận thưởng",
    homeLabel: "Trung tâm Khán giả",
    menu: [
      { id: "dashboard", label: "Tổng quan", abbr: "TQ" },
      { id: "tournaments", label: "Giải đấu", abbr: "GĐ" },
      { id: "live", label: "Kết quả trực tiếp", abbr: "TT" },
      { id: "predictions", label: "Dự đoán", abbr: "DĐ" },
      { id: "rewards", label: "Ví điểm", abbr: "VD" },
      { id: "account", label: "Tài khoản của tôi", abbr: "CN" },
    ],
  },
  admin: {
    label: "Quản trị viên",
    accent: "Quản lý vận hành hệ thống, duyệt đăng ký và công bố kết quả",
    homeLabel: "Trung tâm quản trị",
    menu: [
      { id: "dashboard", label: "Tổng quan", abbr: "TQ" },
      { id: "users", label: "Tài khoản", abbr: "TK" },
      { id: "racetracks", label: "Đường đua", abbr: "ĐĐ" },
      { id: "races", label: "Thiết lập đua", abbr: "TL" },
      { id: "tournaments", label: "Giải đấu", abbr: "GĐ" },
      { id: "approvals", label: "Duyệt đơn", abbr: "DU" },
      { id: "jockey-approvals", label: "Duyệt Jockey", abbr: "DJ" },
      { id: "owner-approvals", label: "Duyệt Chủ ngựa", abbr: "DC" },
      { id: "violation-rules", label: "Luật vi phạm", abbr: "LV" },
      { id: "results", label: "Kết quả & Dự đoán", abbr: "KD" },
      { id: "account", label: "Tài khoản của tôi", abbr: "CN" },
    ],
  },
};
