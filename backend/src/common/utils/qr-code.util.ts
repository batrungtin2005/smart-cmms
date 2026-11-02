import * as QRCode from 'qrcode';

export interface QrLabelPayload {
  title: string;
  assetCode: string;
  name: string;
  category: string;
  locationName: string;
  installDate: string | null;
  qrDataUrl: string;
  qrRawContent: string;
}

export class QrCodeUtil {
  /**
   * Sinh chuỗi Data URL Base64 PNG để hiển thị trực tiếp trên thẻ <img> hoặc tem nhãn
   */
  static async toDataURL(
    text: string,
    options?: QRCode.QRCodeToDataURLOptions,
  ): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      ...options,
    });
  }

  /**
   * Sinh mã SVG chất lượng cao (vector) phục vụ máy in tem nhãn công nghiệp không vỡ hạt
   */
  static async toSvg(
    text: string,
    options?: QRCode.QRCodeToStringOptions,
  ): Promise<string> {
    return QRCode.toString(text, {
      type: 'svg',
      margin: 2,
      ...options,
    });
  }

  /**
   * Sinh Buffer ảnh PNG để stream tải file trực tiếp về máy tính kỹ thuật viên
   */
  static async toBuffer(
    text: string,
    options?: QRCode.QRCodeToBufferOptions,
  ): Promise<Buffer> {
    return QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 400,
      ...options,
    });
  }

  /**
   * Tạo chuỗi định danh nội dung QR chuẩn cho thiết bị CMMS
   */
  static formatAssetQrPayload(asset: {
    id: string;
    assetCode: string;
    name: string;
  }): string {
    // Định dạng chuỗi nhận diện chuẩn cho ứng dụng Mobile Scanner
    return JSON.stringify({
      app: 'SMART_CMMS',
      assetCode: asset.assetCode,
      assetId: asset.id,
      name: asset.name,
      v: '1.0',
    });
  }
}

