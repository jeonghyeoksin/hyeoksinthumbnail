import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Loader2, Image as ImageIcon, Sparkles, Youtube, Layout, 
  Palette, Type as TypeIcon, Lightbulb, Users, Smile, 
  Focus, Paintbrush, Play, MoreVertical, ThumbsUp, MessageSquare,
  Search, BrainCircuit, Key, X, Coins, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BrainstormResult {
  catchyText: string;
  visualElements: string;
  colorPalette: string;
  imagePrompt: string;
  reasoning: string;
}

interface FormData {
  topic: string;
  audience: string;
  mood: string;
  focus: string;
  style: string;
  aspectRatio: string;
}

export default function App() {
  const [formData, setFormData] = useState<FormData>({
    topic: '',
    audience: '',
    mood: '',
    focus: '',
    style: '',
    aspectRatio: '16:9'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [brainstorm, setBrainstorm] = useState<BrainstormResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isCostInfoOpen, setIsCostInfoOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setCustomApiKey(savedKey);
      setTempApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempApiKey);
    setCustomApiKey(tempApiKey);
    setIsApiKeyModalOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setPersonImage({
        data: base64String,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      document.fonts.ready.then(() => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw background
        ctx.drawImage(img, 0, 0);

        // Draw text
        if (brainstorm?.catchyText) {
          const lines = brainstorm.catchyText.split('\n');
          const fontSize = Math.floor(canvas.height * 0.14);
          ctx.font = `${fontSize}px GmarketSansBold, sans-serif`;
          ctx.textBaseline = 'bottom';
          ctx.textAlign = 'left';

          const lineHeight = fontSize * 1.2;
          const paddingLeft = canvas.width * 0.05;
          const paddingBottom = canvas.height * 0.08;
          const startY = canvas.height - paddingBottom - (lines.length - 1) * lineHeight;

          lines.forEach((line, index) => {
            const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
            const y = startY + index * lineHeight;

            // Pass 1: Stroke and Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = canvas.height * 0.02;
            ctx.shadowOffsetY = canvas.height * 0.01;
            ctx.lineWidth = fontSize * 0.08;
            ctx.strokeStyle = 'black';
            ctx.lineJoin = 'round';

            let currentX = paddingLeft;
            parts.forEach(part => {
              let textToDraw = part;
              if (part.startsWith('**') && part.endsWith('**')) {
                textToDraw = part.slice(2, -2);
              }
              ctx.strokeText(textToDraw, currentX, y);
              currentX += ctx.measureText(textToDraw).width;
            });

            // Pass 2: Fill
            ctx.shadowColor = 'transparent';
            currentX = paddingLeft;
            parts.forEach(part => {
              let isHighlight = false;
              let textToDraw = part;
              if (part.startsWith('**') && part.endsWith('**')) {
                isHighlight = true;
                textToDraw = part.slice(2, -2);
              }
              ctx.fillStyle = isHighlight ? '#facc15' : '#ffffff';
              ctx.fillText(textToDraw, currentX, y);
              currentX += ctx.measureText(textToDraw).width;
            });
          });
        }
      });
    };
  }, [imageUrl, brainstorm?.catchyText]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegenerateImage = async () => {
    if (!brainstorm) return;
    setIsGenerating(true);
    setError(null);
    try {
      const currentApiKey = customApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!currentApiKey) {
        setIsApiKeyModalOpen(true);
        throw new Error("API 키를 입력해주세요.");
      }
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const imageParts: any[] = [];
      if (personImage) {
        imageParts.push({
          inlineData: { data: personImage.data, mimeType: personImage.mimeType }
        });
      }
      imageParts.push({ 
        text: brainstorm.imagePrompt + " (CRITICAL: No text, no words, no letters in the image. Clean background only." + (personImage ? " The provided image is the main subject. Seamlessly integrate this person into the scene." : "") + ")" 
      });

      const imageResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: imageParts },
        config: { imageConfig: { aspectRatio: formData.aspectRatio, imageSize: '1K' } },
      });
      let generatedImageUrl = null;
      const parts = imageResponse.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      if (generatedImageUrl) setImageUrl(generatedImageUrl);
      else throw new Error('이미지 생성에 실패했습니다.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || '이미지 재생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeepResearch = async () => {
    if (!formData.topic.trim()) return;
    setIsResearching(true);
    setError(null);

    try {
      const currentApiKey = customApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!currentApiKey) {
        setIsApiKeyModalOpen(true);
        throw new Error("API 키를 입력해주세요.");
      }
      const ai = new GoogleGenAI({ apiKey: currentApiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `You are an expert YouTube content strategist and thumbnail designer.
        The user has provided a core topic for a YouTube video: "${formData.topic}".
        Conduct a deep research and suggest the best parameters for a highly clickable thumbnail.
        Provide the response in JSON format with the following keys:
        - audience: Target audience (e.g., "코딩 입문자, 2030 직장인")
        - mood: The vibe of the video. MUST be exactly one of: "충격적이고 호기심을 유발하는", "전문적이고 신뢰감 있는", "유머러스하고 재미있는", "감성적이고 따뜻한", "긴장감 넘치고 역동적인"
        - focus: Main object or person to focus on (e.g., "놀란 표정의 유튜버, 빛나는 노트북")
        - style: Preferred color palette and visual style (e.g., "네온 핑크와 블랙 대비, 깔끔한 화이트톤")
        All values must be in Korean.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              audience: { type: Type.STRING },
              mood: { type: Type.STRING },
              focus: { type: Type.STRING },
              style: { type: Type.STRING },
            },
            required: ['audience', 'mood', 'focus', 'style'],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) throw new Error('딥리서치 결과를 가져오지 못했습니다.');
      
      const researchData = JSON.parse(resultText);
      setFormData(prev => ({
        ...prev,
        audience: researchData.audience,
        mood: researchData.mood,
        focus: researchData.focus,
        style: researchData.style,
      }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || '딥리서치 중 오류가 발생했습니다.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.topic.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setBrainstorm(null);
    setImageUrl(null);

    try {
      if ((window as any).aistudio && !customApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
        }
      }

      const currentApiKey = customApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!currentApiKey) {
        setIsApiKeyModalOpen(true);
        throw new Error("API 키를 입력해주세요.");
      }
      const ai = new GoogleGenAI({ apiKey: currentApiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are an expert YouTube thumbnail designer and marketer. 
        The user wants to create a thumbnail with the following details:
        - Core Topic: "${formData.topic}"
        - Target Audience: "${formData.audience || 'General audience'}"
        - Mood/Vibe: "${formData.mood || 'Engaging and clickable'}"
        - Main Focus/Object: "${formData.focus || 'Relevant subject'}"
        - Preferred Style/Colors: "${formData.style || 'High contrast, eye-catching'}"
        ${personImage ? '- Note: The user has provided a reference photo of a person. The image prompt MUST include instructions to seamlessly integrate this person into the thumbnail background.' : ''}

        Brainstorm the best thumbnail concept that will maximize click-through rate (CTR).
        Provide the following in JSON format:
        - catchyText: Short, highly engaging text to display on the thumbnail. MUST be exactly two lines. Use '\n' to separate the two lines. Wrap the most important 1-2 words in double asterisks for highlighting (e.g., "이것만 알면\n**유튜브** 떡상"). Write this in Korean.
        - visualElements: Description of the main visual elements, characters, or objects. Write this in Korean.
        - colorPalette: The primary colors to use for high contrast and attention. Write this in Korean.
        - imagePrompt: A detailed prompt in English to generate the background/visuals of this thumbnail using an AI image generator. It should focus on high quality, vibrant colors, and clear subjects suitable for a YouTube thumbnail. CRITICAL: DO NOT include any instructions to generate text, words, or letters in the image. The image must be a clean background/scene without any typography.
        - reasoning: Why this concept will get high clicks. Write this in Korean.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              catchyText: { type: Type.STRING },
              visualElements: { type: Type.STRING },
              colorPalette: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ['catchyText', 'visualElements', 'colorPalette', 'imagePrompt', 'reasoning'],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) throw new Error('브레인스토밍 결과를 가져오지 못했습니다.');
      
      const brainstormData = JSON.parse(resultText) as BrainstormResult;
      setBrainstorm(brainstormData);

      const imageParts: any[] = [];
      if (personImage) {
        imageParts.push({
          inlineData: { data: personImage.data, mimeType: personImage.mimeType }
        });
      }
      imageParts.push({ 
        text: brainstormData.imagePrompt + " (CRITICAL: No text, no words, no letters in the image. Clean background only." + (personImage ? " The provided image is the main subject. Seamlessly integrate this person into the scene." : "") + ")" 
      });

      const imageResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: imageParts },
        config: {
          imageConfig: {
            aspectRatio: formData.aspectRatio,
            imageSize: '1K',
          },
        },
      });

      let generatedImageUrl = null;
      const parts = imageResponse.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (generatedImageUrl) {
        setImageUrl(generatedImageUrl);
      } else {
        throw new Error('이미지 생성에 실패했습니다.');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || '생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-neutral-50 font-sans selection:bg-red-500/30 pb-24">
      {/* Top Navigation Bar */}
      <nav className="border-b border-white/10 bg-[#0f0f0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">혁신 유튜브 썸네일 <span className="text-red-500">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCostInfoOpen(!isCostInfoOpen)}
              className="text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-full border border-white/10 transition-colors flex items-center gap-2"
            >
              <Info className="w-3.5 h-3.5" />
              API 비용
            </button>
            <div className="hidden sm:block text-xs font-mono text-neutral-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              CREATOR STUDIO PRO
            </div>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-full border border-white/10 transition-colors flex items-center gap-2"
            >
              <Key className="w-3.5 h-3.5" />
              Google API Key
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Image Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 relative w-full max-w-5xl mx-auto aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 group bg-neutral-900"
        >
          <img 
            src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2000&auto=format&fit=crop" 
            alt="유튜브 네온 배경" 
            className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/70 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <motion.img 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", bounce: 0.5 }}
              src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg"
              alt="YouTube Logo"
              className="w-24 md:w-32 mb-6 drop-shadow-2xl"
            />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider mb-6 backdrop-blur-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              NEXT-GEN THUMBNAIL GENERATOR
            </motion.div>
            <h1 
              className="text-5xl md:text-7xl font-gmarket text-white tracking-tight leading-tight"
              style={{ textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
            >
              혁신 유튜브 썸네일 <span className="text-red-500">AI</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-neutral-300 max-w-2xl drop-shadow-md font-medium">
              알고리즘의 선택을 받는 완벽한 썸네일을 설계하세요.<br className="hidden sm:block" />
              당신의 콘텐츠에 날개를 달아줄 AI 디자인 스튜디오입니다.
            </p>
          </div>
        </motion.div>

        {/* Form Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl mb-16 relative overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/10 blur-[100px] pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Core Topic - Full Width */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                  <Youtube className="w-4 h-4 text-red-500" />
                  영상 핵심 주제 <span className="text-red-500">*</span>
                </label>
                <button
                  onClick={handleDeepResearch}
                  disabled={isResearching || isGenerating || !formData.topic.trim()}
                  className="flex items-center gap-1.5 text-xs font-bold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="AI가 주제를 분석하여 나머지 항목을 자동으로 채워줍니다."
                >
                  {isResearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                  딥리서치 자동완성
                </button>
              </div>
              <textarea
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                placeholder="예: 10분 만에 끝내는 초보자용 리액트 완벽 가이드"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all resize-none h-24"
              />
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                <Users className="w-4 h-4 text-blue-400" />
                타겟 시청자
              </label>
              <input
                type="text"
                name="audience"
                value={formData.audience}
                onChange={handleChange}
                placeholder="예: 코딩 입문자, 2030 직장인"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>

            {/* Mood / Vibe */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                <Smile className="w-4 h-4 text-yellow-400" />
                영상 분위기
              </label>
              <select
                name="mood"
                value={formData.mood}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all appearance-none"
              >
                <option value="">선택해주세요 (자유)</option>
                <option value="충격적이고 호기심을 유발하는">😲 충격적 / 호기심 유발</option>
                <option value="전문적이고 신뢰감 있는">👔 전문적 / 신뢰감</option>
                <option value="유머러스하고 재미있는">😂 유머러스 / 재미</option>
                <option value="감성적이고 따뜻한">✨ 감성적 / 힐링</option>
                <option value="긴장감 넘치고 역동적인">🔥 긴장감 / 역동적</option>
              </select>
            </div>

            {/* Main Focus */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                <Focus className="w-4 h-4 text-emerald-400" />
                강조할 오브젝트/인물
              </label>
              <input
                type="text"
                name="focus"
                value={formData.focus}
                onChange={handleChange}
                placeholder="예: 놀란 표정의 유튜버, 빛나는 노트북"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>

            {/* Preferred Style */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                <Paintbrush className="w-4 h-4 text-purple-400" />
                선호 컬러 / 스타일
              </label>
              <input
                type="text"
                name="style"
                value={formData.style}
                onChange={handleChange}
                placeholder="예: 네온 핑크와 블랙 대비, 깔끔한 화이트톤"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
              />
            </div>

            {/* Aspect Ratio Selection */}
            <div className="md:col-span-2 space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                <Layout className="w-4 h-4 text-orange-400" />
                이미지 사이즈 / 비율
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: '16:9', label: 'YouTube (16:9)', desc: '표준 영상' },
                  { id: '9:16', label: 'Shorts (9:16)', desc: '쇼츠/틱톡' },
                  { id: '1:1', label: 'Square (1:1)', desc: '인스타그램' },
                  { id: '4:3', label: 'Classic (4:3)', desc: '태블릿/사진' },
                ].map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setFormData(prev => ({ ...prev, aspectRatio: size.id }))}
                    className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-1 ${
                      formData.aspectRatio === size.id
                        ? 'bg-orange-500/20 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                        : 'bg-black/50 border-white/10 text-neutral-400 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-sm font-bold">{size.label}</span>
                    <span className="text-[10px] opacity-60">{size.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Person Photo (Optional) */}
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                <ImageIcon className="w-4 h-4 text-pink-400" />
                인물 사진 (선택)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-neutral-400
                    file:mr-4 file:py-2.5 file:px-4
                    file:rounded-xl file:border-0
                    file:text-sm file:font-bold
                    file:bg-pink-500/10 file:text-pink-400
                    hover:file:bg-pink-500/20 transition-all cursor-pointer border border-white/10 rounded-xl bg-black/50"
                />
                {personImage && (
                  <button onClick={() => setPersonImage(null)} className="text-sm font-bold text-red-400 hover:text-red-300 whitespace-nowrap px-4 py-2 bg-red-500/10 rounded-xl">
                    삭제
                  </button>
                )}
              </div>
              {personImage && (
                <div className="mt-3">
                  <img src={`data:${personImage.mimeType};base64,${personImage.data}`} alt="Uploaded person" className="h-24 w-24 rounded-xl object-cover border border-white/20 shadow-lg" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI가 입력된 정보를 바탕으로 최적의 썸네일을 기획합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {brainstorm && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isResearching || !formData.topic.trim()}
                  className="w-full sm:w-auto bg-neutral-800 text-white hover:bg-neutral-700 disabled:opacity-50 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <Sparkles className="w-5 h-5" />
                  전체 다시생성
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isResearching || !formData.topic.trim()}
                className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 disabled:bg-white/10 disabled:text-white/30 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shrink-0 group"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:text-red-600 transition-colors" />
                    {brainstorm ? '새로운 컨셉 생성' : '썸네일 생성 시작'}
                  </>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {(brainstorm || imageUrl || isGenerating) && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Brainstorming Data */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-6 bg-red-500 rounded-full" />
                  <h2 className="text-2xl font-bold uppercase tracking-tight">AI Strategy</h2>
                </div>
                
                {brainstorm ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl border bg-white/5 border-white/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TypeIcon className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Catchy Copy (수정 가능)</h3>
                      </div>
                      <textarea
                        value={brainstorm.catchyText}
                        onChange={(e) => setBrainstorm({ ...brainstorm, catchyText: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-lg font-bold text-white resize-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        rows={2}
                      />
                    </div>
                    <DataCard 
                      icon={<Layout className="w-4 h-4 text-emerald-400" />}
                      title="Visual Elements"
                      content={brainstorm.visualElements}
                    />
                    <DataCard 
                      icon={<Palette className="w-4 h-4 text-purple-400" />}
                      title="Color Palette"
                      content={brainstorm.colorPalette}
                    />
                    <DataCard 
                      icon={<Lightbulb className="w-4 h-4 text-yellow-400" />}
                      title="CTR Reasoning"
                      content={brainstorm.reasoning}
                    />
                  </div>
                ) : (
                  <div className="h-[400px] bg-[#1a1a1a] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 text-neutral-500">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    <p className="animate-pulse font-mono text-sm">ANALYZING ALGORITHM...</p>
                  </div>
                )}
              </div>

              {/* Right Column: YouTube Preview */}
              <div className="lg:col-span-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-6 bg-white rounded-full" />
                  <h2 className="text-2xl font-bold uppercase tracking-tight">Preview</h2>
                </div>
                
                <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl">
                  {/* YouTube Video Card Mockup */}
                  <div className="max-w-[600px] mx-auto">
                    <div className={`relative bg-black rounded-xl overflow-hidden group cursor-pointer transition-all duration-500 ${
                      formData.aspectRatio === '16:9' ? 'aspect-video' :
                      formData.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[600px] mx-auto' :
                      formData.aspectRatio === '1:1' ? 'aspect-square' :
                      'aspect-[4/3]'
                    }`}>
                      {imageUrl ? (
                        <>
                          <canvas 
                            ref={canvasRef}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          {/* YouTube Timestamp Mock */}
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                            10:24
                          </div>
                          
                          {/* Hover Download Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateImage();
                              }}
                              disabled={isGenerating}
                              className="bg-neutral-800 text-white px-6 py-3 rounded-full font-bold hover:bg-neutral-700 transition-colors flex items-center gap-2"
                            >
                              <Sparkles className="w-5 h-5" />
                              배경 이미지만 다시생성
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canvasRef.current) {
                                  const link = document.createElement('a');
                                  link.download = 'thumbnail.png';
                                  link.href = canvasRef.current.toDataURL('image/png');
                                  link.click();
                                }
                              }}
                              className="bg-red-600 text-white px-6 py-3 rounded-full font-bold hover:bg-red-500 transition-colors flex items-center gap-2"
                            >
                              <ImageIcon className="w-5 h-5" />
                              합성된 썸네일 다운로드
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 gap-4 bg-neutral-900">
                          <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                          <p className="font-mono text-sm">RENDERING PIXELS...</p>
                        </div>
                      )}
                    </div>

                    {/* YouTube Metadata Mockup */}
                    <div className="mt-4 flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-red-500 shrink-0" />
                      <div>
                        <h3 className="text-white font-medium line-clamp-2 leading-snug">
                          {formData.topic || '여기에 영상 제목이 표시됩니다. 클릭을 유도하는 매력적인 제목을 작성해보세요.'}
                        </h3>
                        <p className="text-neutral-400 text-sm mt-1">Creator Channel • 조회수 124만회 • 2일 전</p>
                      </div>
                      <div className="ml-auto">
                        <MoreVertical className="w-5 h-5 text-neutral-400" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-neutral-500 text-sm mt-4 text-center flex items-center justify-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  텍스트와 이미지가 하나로 합성되어 다운로드됩니다.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* API Cost Info Overlay */}
      <AnimatePresence>
        {isCostInfoOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 20, y: -10 }}
            className="fixed top-20 right-6 z-[60] w-80 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                API 사용 비용 안내
              </h3>
              <button 
                onClick={() => setIsCostInfoOpen(false)} 
                className="p-1 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-neutral-300">Gemini 3 Flash</span>
                  </div>
                  <span className="font-mono text-red-400">$0.075 / 1M 토큰</span>
                </div>
                <p className="px-2 text-[10px] text-neutral-500 italic">기본 브레인스토밍 및 카피 생성</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-neutral-300">Gemini 3.1 Pro</span>
                  </div>
                  <span className="font-mono text-indigo-400">$3.50 / 1M 토큰</span>
                </div>
                <p className="px-2 text-[10px] text-neutral-500 italic">딥리서치 및 고도화된 전략 분석</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-neutral-300">이미지 생성 (1K)</span>
                  </div>
                  <span className="font-mono text-pink-400">약 $0.03 / 장</span>
                </div>
                <p className="px-2 text-[10px] text-neutral-500 italic">고품질 썸네일 배경 이미지 생성</p>
              </div>

              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-[10px] text-yellow-200/70 leading-relaxed">
                  * 위 비용은 Google Cloud 표준 요금 기준 예상치입니다. 무료 티어 범위 내에서는 비용이 발생하지 않을 수 있습니다.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Key Modal */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  API 키 설정
                </h3>
                <button onClick={() => setIsApiKeyModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-neutral-400">
                  Vercel 등 외부 배포 환경에서 사용하기 위해 Gemini API 키를 입력해주세요. 입력하신 키는 브라우저 로컬 스토리지에만 안전하게 저장됩니다.
                </p>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-neutral-300 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all"
                  >
                    적용
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Developer Info */}
      {/* API Key Modal */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  API 키 설정
                </h3>
                <button onClick={() => setIsApiKeyModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-neutral-400">
                  Vercel 등 외부 배포 환경에서 사용하기 위해 Gemini API 키를 입력해주세요. 입력하신 키는 브라우저 로컬 스토리지에만 안전하게 저장됩니다.
                </p>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-neutral-300 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveApiKey}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all"
                  >
                    적용
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-6 z-50 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-neutral-300">개발자 : 정혁신</span>
        </div>
      </div>
    </div>
  );
}

function DataCard({ icon, title, content, highlight = false }: { icon: React.ReactNode, title: string, content: string, highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border ${highlight ? 'bg-white/5 border-white/20' : 'bg-white/[0.02] border-white/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{title}</h3>
      </div>
      <p className={`leading-relaxed ${highlight ? 'text-lg font-bold text-white' : 'text-sm text-neutral-300'}`}>
        {content}
      </p>
    </div>
  );
}
