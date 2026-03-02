# Phase 2: User Setup Required

**Generated:** 2026-03-02
**Phase:** 02-full-conversation-pipeline
**Status:** Incomplete

Complete these items for the NVIDIA LLM integration to function. Claude automated everything possible; these items require human access to external dashboards/accounts.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `NVIDIA_API_KEY` | NVIDIA NGC Catalog → API Keys → Add API Key | `.env.local` |
| [ ] | `NVIDIA_BASE_URL` | NVIDIA NIM endpoint (default: https://integrate.api.nvidia.com) | `.env.local` |
| [ ] | `NVIDIA_MODEL` | Model name (default: nvidia/llama-3.1-nemotron-70b-instruct) | `.env.local` |

## Account Setup

- [ ] **Create NVIDIA API account** (if needed)
  - URL: https://ngc.nvidia.com/signup
  - Skip if: Already have NVIDIA account

## Dashboard Configuration

- [ ] **Generate NVIDIA API Key**
  - Location: NVIDIA NGC Catalog → API Keys → Add API Key
  - Note: Copy the key immediately - it's shown only once
  - Add to `.env.local` as `NVIDIA_API_KEY`

- [ ] **Verify NIM endpoint access** (optional)
  - Default endpoint: https://integrate.api.nvidia.com/v1
  - The service will fallback to default if not specified

## Local Development

For local development, add to `.env.local`:
```bash
NVIDIA_API_KEY=your-api-key-here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com
NVIDIA_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
```

## Verification

After completing setup:

```bash
# Check env vars are set
grep NVIDIA .env.local

# Test LLM service import
python -c "from backend.services.llm_service import LLMService; print('OK')"
```

Expected: Import succeeds, no errors about missing API key (though key may be invalid at runtime).

---

**Once all items complete:** Mark status as "Complete" at top of file.
