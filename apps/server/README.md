# Server (OpenAI VLM + Offline Pipeline)

## VLM setup

1) Install dotenv in the server package:

pnpm --filter @clearout/server add dotenv

2) Configure environment:

cp apps/server/.env.example apps/server/.env
# edit apps/server/.env and set OPENAI_API_KEY

3) Run the server (dev):

pnpm --filter @clearout/server dev

4) Test an identify call:

curl -F "images=@/path/to/a.jpg" "http://localhost:8787/api/identify?provider=openai&enableStages=barcode,ocr,vlm"

Notes:
- If OPENAI_API_KEY is not set, the server still runs but logs a one-time warning and VLM is disabled; barcode/OCR/mock continue to work.
- The API accepts query params: enableStages, provider, allowFilenameText, timeoutMs.

