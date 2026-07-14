export const MAX_ZIP_BYTES = 20 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 25 * 1024 * 1024;

export function rejectOversizedRequest(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
    return Response.json(
      { error: "上传请求不能超过 25MB，请选择不超过 20MB 的 ZIP 应用包" },
      { status: 413 },
    );
  }
  return null;
}
