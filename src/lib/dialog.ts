export interface CustomDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const showCustomAlert = (
  title: string,
  message: string,
  onConfirm?: () => void,
  icon?: string
) => {
  window.dispatchEvent(
    new CustomEvent('show-custom-dialog', {
      detail: {
        type: 'alert',
        title,
        message,
        confirmText: 'Đồng ý',
        onConfirm,
        icon,
      },
    })
  );
};

export const showCustomConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  icon?: string
) => {
  window.dispatchEvent(
    new CustomEvent('show-custom-dialog', {
      detail: {
        type: 'confirm',
        title,
        message,
        confirmText: 'Xác nhận',
        cancelText: 'Hủy',
        onConfirm,
        onCancel,
        icon,
      },
    })
  );
};

export const showToast = (message: string) => {
  window.dispatchEvent(
    new CustomEvent('show-custom-toast', {
      detail: { message }
    })
  );
};
