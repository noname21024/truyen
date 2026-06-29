import React from 'react';
import { useLocation } from 'react-router-dom';

const Footer: React.FC = () => {
  const location = useLocation();
  const isChapterPage = location.pathname.startsWith('/chapter/');

  return (
    <footer className={`w-full mt-16 border-t border-surface-variant bg-surface-bright flex flex-col items-center space-y-6 py-12 px-4 relative z-10 ${
      isChapterPage ? 'pb-44 md:pb-36' : 'pb-24 md:pb-12'
    }`}>
      <div className="flex items-center gap-1.5">
        <img src="/logo.svg" alt="Pub Nih Truyện Logo" className="w-[25px] h-[25px] object-contain shrink-0" />
        <span className="font-black tracking-tight text-primary text-sm sm:text-base flex items-center gap-0.5 select-none">
          PUB<span className="text-on-surface font-light">NIH</span>
          <span className="text-[7px] bg-primary/10 text-primary px-1 py-0.5 rounded-sm tracking-widest font-black ml-0.5 uppercase">TRUYỆN</span>
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-6 font-label-bold text-label-bold">
        <a className="text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-primary-container transition-all" href="#">Về chúng tôi</a>
        <a className="text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-primary-container transition-all" href="#">Điều khoản sử dụng</a>
        <a className="text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-primary-container transition-all" href="#">Chính sách bảo mật</a>
        <a className="text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-primary-container transition-all" href="#">Liên hệ</a>
      </div>
      <p className="font-body-ui text-[13px] leading-relaxed text-on-surface-variant/90 text-center max-w-5xl opacity-90 px-4">
        © 2026 Pub Nih Truyện. Tất cả nội dung truyện chữ trên website được tổng hợp từ các nguồn công cộng trên internet, và nội dung truyện audio được hệ thống tự động chuyển đổi từ truyện chữ mà không thu thập hay lưu trữ từ bên ngoài. Chúng tôi không sở hữu bản quyền, không chỉnh sửa nội dung và không chịu bất kỳ trách nhiệm pháp lý nào liên quan đến bản quyền, tính chính xác hay quan điểm trong các tác phẩm. Nếu bạn là chủ sở hữu bản quyền và phát hiện nội dung vi phạm, vui lòng liên hệ ngay với chúng tôi qua email để tiến hành kiểm tra và gỡ bỏ trong thời gian sớm nhất. Người dùng tự chịu trách nhiệm toàn bộ khi sử dụng nội dung trên website. Chúng tôi không khuyến khích sao chép, phát tán trái phép và khuyến nghị mọi người tôn trọng quyền tác giả.
      </p>
    </footer>
  );
};

export default Footer;
