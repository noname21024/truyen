export const isUserVIP = (username: string): boolean => {
  if (!username) return false;
  
  // Check currently logged-in user VIP status in session
  try {
    const saved = localStorage.getItem('user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u.name === username) {
        return u.is_vip === true || u.is_vip === 'true';
      }
    }
  } catch {}

  // Mock VIP users to demonstrate rainbow borders and colorful tags in comments
  const MOCK_VIP_USERS = ['YukiReader', 'SoraTrans', 'TruyenVipMaster', 'AdminVip'];
  return MOCK_VIP_USERS.includes(username);
};
