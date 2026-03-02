# Feature Landscape

**Domain:** Real-time Voice Assistant Apps (ChatGPT Voice, Gemini Live, Perplexity Voice)
**Researched:** 2026-03-02

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time speech-to-text (STT) | Near-instant transcription as user speaks - fundamental to voice conversation | High | Must achieve <500ms latency for natural feel. Multiple providers (Whisper, Deepgram, AssemblyAI) |
| Streaming text-to-speech (TTS) | Audio plays progressively, not waiting for full AI response | High | Critical for conversation flow. OpenAI, ElevenLabs, Google TTS support streaming |
| Multiple voice options | Users want choice in assistant personality | Low | 4-6 voices standard (ChatGPT: Juniper, Cove, Spruce, etc.) |
| Start/stop conversation controls | Clear UX for initiating and ending calls | Low | Voice button to start, explicit end, or automatic end detection |
| Background noise handling | Real-world usage involves imperfect acoustic environments | Medium | Noise suppression, echo cancellation, VAD (voice activity detection) |
| Low latency response | Conversations feel natural only with sub-second response | High | End-to-end latency (STT + LLM + TTS) must be <1-2 seconds |
| Conversation turn detection | Know when user has finished speaking vs paused | Medium | Critical for natural flow - false triggers or missed ends break experience |
| Continuous conversation mode | Single activation = multiple exchanges without re-triggering | Low | Default behavior for modern voice assistants |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Voice cloning / custom voice | Personalization - users can clone any voice for TTS output | High | ElevenLabs, OpenAI Voice Engine offer cloning. This is VoiceCode's specific differentiator |
| Advanced interruption handling (barge-in) | Natural conversation - user can interrupt mid-response | High | ChatGPT and Gemini Live handle interruptions. Deepgram Flux specifically addresses this |
| Visual components during voice | Richer experience - see results while listening | Medium | ChatGPT (2025) shows maps, images, transcripts during voice mode |
| Deep app integration | Actually perform tasks - calendar, email, music, smart home | High | Perplexity can play music, access calendar, send emails. Gemini for Home controls Nest devices |
| Context memory across sessions | Remembers preferences, past conversations | Medium | Remembers voice choice, topics discussed, preferences |
| Multi-language support | Global audience, language learning, translation | High | Gemini Live and ChatGPT support multiple languages |
| Unified voice + text experience | Switch seamlessly between speaking and typing | Medium | ChatGPT 2025 update integrates voice into main chat interface |
| Extended conversation duration | No artificial time limits on calls | Low | Depends on infrastructure costs, but expected for serious use |
| Real-time web search during conversation | Current information, not just training data | Medium | Perplexity's core strength - voice + live search |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Non-streaming TTS | Waiting for full AI response before audio starts feels broken | Always stream TTS from first word/phrase generated |
| High latency STT | >1 second transcription delay kills conversational flow | Prioritize low-latency STT providers, accept tradeoffs on accuracy if needed |
| No voice activity detection | Background noise triggers false transcription, wastes resources | Implement VAD to detect actual speech vs silence/noise |
| Single voice only | Extremely limited - users expect choice | Offer 4-6 voice options with different personalities |
| No interruption support | Feels robotic - user trapped listening to unwanted response | Implement barge-in detection, stop speaking within 300ms of user speech |
| Text-only response to voice | Confusing UX - why speak if can't hear? | Always respond with audio, optionally show transcript |
| Session limits without warning | Conversation cuts off unexpectedly | Clear indicators of session state, graceful handoff or warning |
| Poor noise handling | Unusable in real environments (car, office, street) | Include noise suppression, echo cancellation |

## Feature Dependencies

```
Real-time STT → Turn detection → Continuous conversation
Voice selection → Voice cloning (builds on voice system)
Streaming TTS → Low latency response
STT + LLM + TTS → Full pipeline integration
Noise handling → VAD → Turn detection
```

## MVP Recommendation

Prioritize:
1. **Real-time STT** - Table stakes, non-negotiable for voice assistant
2. **Streaming TTS** - Table stakes, enables conversation flow
3. **Low latency pipeline** - Table stakes, sub-second end-to-end required
4. **Multiple voice options** - Table stakes, standard expectation
5. **Voice cloning** - Differentiator - core to VoiceCode's value proposition
6. **Conversation turn detection** - Table stakes, enables natural flow

Defer: **Deep app integration**: High complexity, not required for core voice conversation experience. Can be added post-MVP.

Defer: **Multi-language support**: Out of scope per PROJECT.md, focus on English-only initially.

Defer: **Visual components**: Nice-to-have for richness, but audio-first is core.

## Sources

- OpenAI ChatGPT Voice Mode features: https://chatgpt.com/features/voice/
- Gemini Live updates: https://blog.google/products/gemini/gemini-live-updates-august-2025
- Perplexity Voice launch: https://www.theverge.com/news/654946/perplexity-ai-mobile-assistant-ios-iphone
- Voice AI essential features: https://blogs.voicegenie.ai/8-essential-features-every-ai-voice-bot-should-have
- Barge-in and turn detection: https://comparevoiceai.com/blog/handle-interruption-detection-voice-ai-agent
- AssemblyAI voice agent features: https://www.assemblyai.com/blog/voice-agent-features
- Deepgram Flux (conversational STT): https://deepgram.com/learn/introducing-flux-conversational-speech-recognition

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table Stakes | HIGH | Well-documented across all major voice assistants |
| Differentiators | MEDIUM | Voice cloning is less common; app integration varies by platform |
| Anti-Features | HIGH | Industry consensus on latency and streaming requirements |
| Dependencies | HIGH | Clear technical dependencies in voice pipeline |
