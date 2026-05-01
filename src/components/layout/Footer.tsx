import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-16 border-t border-surface-variant bg-surface-bright flex flex-col items-center space-y-6 py-12 px-4 pb-24 md:pb-12 relative z-10">
      <div className="text-primary font-bold text-lg sm:text-xl italic font-headline-sm flex items-center gap-2">
        <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          auto_awesome
        </span>
        YumeNovel
      </div>
      <div className="flex flex-wrap justify-center gap-6 font-label-bold text-label-bold">
        <a className="text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-primary-container transition-all" href="#">Về chúng tôi</a>
        <a className="text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-primary-container transition-all" href="#">Điều khoản sử dụng</a>
        <a className="text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-primary-container transition-all" href="#">Chính sách bảo mật</a>
        <a className="text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-primary-container transition-all" href="#">Liên hệ</a>
      </div>
      <p className="font-body-ui text-sm text-on-surface-variant text-center max-w-md">
        © 2024 YumeNovel. Cảm hứng từ văn hóa Light Novel Nhật Bản.
      </p>
    </footer>
  );
};

export default Footer;
