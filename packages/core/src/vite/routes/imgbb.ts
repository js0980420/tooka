type ImgbbResponse = {
  success?: boolean;
  data?: { url?: string };
};

export async function uploadImageToImgbb(
  apiKey: string,
  base64Image: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const stripped = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const form = new FormData();
  form.append('key', apiKey);
  form.append('image', stripped);

  const res = await fetcher('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`imgbb upload failed: ${res.status} - ${text}`);
  }

  const data = (await res.json()) as ImgbbResponse;
  if (!data.success || !data.data?.url) {
    throw new Error('imgbb returned an unexpected response');
  }
  return data.data.url;
}
