// Nhãn tiếng Việt cho các giá trị trạng thái ĐANG HIỂN THỊ (đã map ở AppContext).
// Dùng khi render (badge, text) để không đụng tới giá trị nội bộ dùng cho so sánh/logic.

const RACE_STATUS_VI: Record<string, string> = {
  Upcoming: "Sắp diễn ra",
  Ready: "Sẵn sàng",
  Live: "Đang diễn ra",
  Completed: "Đã kết thúc",
  Cancelled: "Đã hủy",
};

const TOURNAMENT_STATUS_VI: Record<string, string> = {
  Draft: "Nháp",
  Registration: "Đang đăng ký",
  Live: "Đang diễn ra",
  Completed: "Đã kết thúc",
};

const REG_STATUS_VI: Record<string, string> = {
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Từ chối",
  Confirmed: "Đã xác nhận",
};

const HEALTH_VI: Record<string, string> = {
  Fit: "Khỏe mạnh",
  Injured: "Chấn thương",
  Retired: "Giải nghệ",
};

const USER_STATUS_VI: Record<string, string> = {
  Active: "Hoạt động",
  Inactive: "Ngừng",
};

const PREDICTION_STATUS_VI: Record<string, string> = {
  Open: "Đang mở",
  Partial: "Một phần",
  Won: "Thắng",
  Lost: "Thua",
  Cancelled: "Đã hủy",
  Pending: "Chờ",
};

const PUBLISH_STATUS_VI: Record<string, string> = {
  Draft: "Nháp",
  Confirmed: "Đã xác nhận",
  Published: "Đã công bố",
  Pending: "Chờ",
};

const INVITATION_STATUS_VI: Record<string, string> = {
  Pending: "Chờ phản hồi",
  Accepted: "Đã chấp nhận",
  Declined: "Đã từ chối",
};

export const viInvitationStatus = (s: string): string => INVITATION_STATUS_VI[s] ?? s;
export const viRaceStatus = (s: string): string => RACE_STATUS_VI[s] ?? s;
export const viTournamentStatus = (s: string): string => TOURNAMENT_STATUS_VI[s] ?? s;
export const viRegStatus = (s: string): string => REG_STATUS_VI[s] ?? s;
export const viHealth = (s: string): string => HEALTH_VI[s] ?? s;
export const viUserStatus = (s: string): string => USER_STATUS_VI[s] ?? s;
export const viPredictionStatus = (s: string): string => PREDICTION_STATUS_VI[s] ?? s;
export const viPublishStatus = (s: string): string => PUBLISH_STATUS_VI[s] ?? s;

// Vai trò
const ROLE_VI: Record<string, string> = {
  owner: "Chủ ngựa",
  horse_owner: "Chủ ngựa",
  jockey: "Nài ngựa",
  referee: "Trọng tài",
  spectator: "Khán giả",
  admin: "Quản trị viên",
};
export const viRole = (s: string): string => ROLE_VI[s] ?? s;
