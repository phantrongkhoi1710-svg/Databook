/**
 * Utility for safe API requests that never crashes on non-JSON / HTML responses.
 */
export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  warning?: string | null;
  message?: string;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  retries = 1
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    // Try parsing response as JSON
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (json) {
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: json.error || `Yêu cầu thất bại (Mã lỗi ${res.status}).`,
          warning: json.warning || null,
        };
      }
      return {
        ok: true,
        status: res.status,
        data: json,
        warning: json.warning || null,
        message: json.message,
      };
    }

    // Response was not JSON (e.g. HTML or plain text)
    if (!res.ok) {
      if (retries > 0 && (res.status === 404 || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, 500));
        return safeFetchJson<T>(url, options, retries - 1);
      }

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          status: res.status,
          error: 'Phiên làm việc đã hết hạn hoặc bạn chưa được cấp quyền.',
        };
      }
      if (res.status === 404) {
        return {
          ok: false,
          status: 404,
          error: 'Không tìm thấy tài nguyên yêu cầu (Mã lỗi 404). Vui lòng làm mới trang hoặc thử lại.',
        };
      }
      return {
        ok: false,
        status: res.status,
        error: `Máy chủ chưa sẵn sàng (Mã lỗi ${res.status}). Vui lòng thử lại sau giây lát.`,
      };
    }

    return {
      ok: false,
      status: res.status,
      error: 'Phản hồi từ máy chủ không đúng định dạng JSON.',
    };
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return safeFetchJson<T>(url, options, retries - 1);
    }
    return {
      ok: false,
      status: 0,
      error: err.message || 'Lỗi kết nối mạng đến máy chủ.',
    };
  }
}
