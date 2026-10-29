import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  Bookmark,
  Star,
  Moon,
  Sun,
  Bot,
  Play,
  Download,
  RefreshCw,
  Tag,
  ArrowRight,
  ShieldCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Settings as SettingsIcon,
  Wand2,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
  SlidersHorizontal,
  Terminal,
  X
} from 'lucide-react';
import { readTheme, loadSavedPrompts, parseEnhancement, detectVariables, assemblePrompt, buildEnhanceQuery } from './lib/promptUtils';
import { callGemini, userMessage, getAccessCode, setAccessCode } from './lib/geminiClient';

// ==========================================
// PRESET TEMPLATES DATA
// ==========================================
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-1',
    title: 'Code Auditor & Security Refactorer',
    category: 'Code',
    targetModel: 'Claude',
    role: 'Principal Software Security Architect & Senior Code Auditor',
    goal: 'Analyze the provided {{programming_language}} code snippet for security vulnerabilities, edge cases, performance bottlenecks, and refactor it adhering to best practices.',
    context: 'The code is part of a high-throughput production microservice handling sensitive user operations. Readability and micro-optimizations are paramount.',
    constraints: '1. Provide a step-by-step security breakdown.\n2. Output the refactored code block with detailed comments.\n3. Mention time and space complexity changes.',
    tone: 'Professional & Technical',
    tags: ['Code', 'Security', 'Refactoring'],
    rating: 4.9
  },
  {
    id: 'tpl-2',
    title: 'Executive Email Polisher & Writer',
    category: 'Productivity',
    targetModel: 'ChatGPT',
    role: 'Executive Communications Director to a Fortune 500 CEO',
    goal: 'Draft a concise, high-impact email response regarding {{email_topic}} targeted at {{recipient_role}}.',
    context: 'The email needs to balance warmth, professional boundaries, and decisive leadership without sounding aggressive or overly formal.',
    constraints: 'Keep total word count under 180 words. Include 2 key action points formatted as bullet points and a clear call to action at the end.',
    tone: 'Diplomatic & Assertive',
    tags: ['Productivity', 'Email', 'Executive'],
    rating: 4.8
  },
  {
    id: 'tpl-3',
    title: 'Socratic Tutor & Concept Explainer',
    category: 'Learning',
    targetModel: 'Gemini',
    role: 'Patient Socratic Professor & Mind-Mapping Educator',
    goal: 'Explain the complex concept of {{complex_concept}} to a student at a {{target_level}} level.',
    context: 'The student understands basic fundamentals but struggles with abstract application. Avoid jargon unless clearly defined with real-world analogies.',
    constraints: 'Start with a vivid real-world metaphor. Break explanation into 3 intuitive phases. End with 2 Socratic questions to test the user comprehension.',
    tone: 'Encouraging & Analytical',
    tags: ['Learning', 'Education', 'Socratic'],
    rating: 4.95
  },
  {
    id: 'tpl-4',
    title: 'Meeting Notes Structurer & Action Plan',
    category: 'Productivity',
    targetModel: 'ChatGPT',
    role: 'Chief of Staff & Technical Program Manager',
    goal: 'Convert raw meeting notes or transcript into a clean, executive-ready summary with key decisions and actionable tasks.',
    context: 'The meeting was held with {{team_name}} regarding {{project_name}} deadlines and architecture blockers.',
    constraints: 'Format output into 4 Markdown sections: 1. Executive Summary, 2. Key Decisions Made, 3. Action Items (Owner | Task | Deadline), 4. Unresolved Blockers.',
    tone: 'Direct & Concise',
    tags: ['Productivity', 'Management', 'Notes'],
    rating: 4.85
  },
  {
    id: 'tpl-5',
    title: 'Photorealistic AI Art & Scene Prompt',
    category: 'Design',
    targetModel: 'Midjourney',
    role: 'Master Concept Artist & Lighting Director',
    goal: 'Create a cinematic photorealistic Midjourney v6 prompt for {{scene_subject}} set in {{environment}}.',
    context: 'The aesthetic should evoke a moody, ethereal cinematic stillness with high textural fidelity and color harmony.',
    constraints: 'Include specific details for camera lens (e.g. 85mm f/1.4), volumetric lighting, atmospheric fog, color grade, render engine, and ratio parameters --ar 16:9 --style raw --v 6.0.',
    tone: 'Descriptive & Visual',
    tags: ['Design', 'Midjourney', 'Creative'],
    rating: 4.92
  },
  {
    id: 'tpl-6',
    title: 'SEO Content Outline & Reader Persona',
    category: 'Marketing',
    targetModel: 'ChatGPT',
    role: 'Senior Content Marketing Strategist & Technical SEO Manager',
    goal: 'Build an exhaustive, high-ranking SEO blog outline for the topic {{target_keyword}} aimed at {{target_audience}}.',
    context: 'The article must outrank competing high-authority articles by offering actionable insights, original data framing, and answering search intent.',
    constraints: 'Provide H2/H3 header structure, search intent alignment, recommended word count per section, and 5 LSI keywords to include naturally.',
    tone: 'Authoritative & Engaging',
    tags: ['Marketing', 'SEO', 'Writing'],
    rating: 4.78
  },
  {
    id: 'tpl-7',
    title: 'UX Persona & Pain-Point Map Generator',
    category: 'Design',
    targetModel: 'Claude',
    role: 'Lead UX Researcher & Behavioral Product Strategist',
    goal: 'Construct a detailed user persona for a user trying to solve {{problem_statement}} using {{product_category}}.',
    context: 'We are designing a next-generation web platform targeting early adopters who value speed and minimal UI complexity.',
    constraints: 'Include Demographics, Core Goals, Frustrations & Blockers, Key Motivations, and a 3-step User Journey Map.',
    tone: 'Empathetic & Structured',
    tags: ['Design', 'UX', 'Research'],
    rating: 4.88
  },
  {
    id: 'tpl-8',
    title: 'Python Bug Hunter & Performance Tuning',
    category: 'Code',
    targetModel: 'Gemini',
    role: 'Staff Python Engineer & Performance Optimization Specialist',
    goal: 'Diagnose runtime errors and memory leaks in the provided Python code snippet.',
    context: 'The application runs under high concurrency with AsyncIO and requires minimum allocation overhead.',
    constraints: 'Point out exact lines causing memory leaks or bottlenecks. Provide vectorized/optimized code alternative using standard library or modern paradigms.',
    tone: 'Technical & Concise',
    tags: ['Code', 'Python', 'Performance'],
    rating: 4.9
  }
];

// Initial Saved Prompts
const INITIAL_SAVED_PROMPTS = [
  {
    id: 'saved-1',
    title: 'Senior Python Code Reviewer',
    category: 'Code',
    targetModel: 'Claude',
    role: 'Senior Python Engineer',
    goal: 'Review python code for idiomatic style, security bugs, and async efficiency.',
    context: 'Production API backend with FastAPI.',
    constraints: 'Use standard markdown code blocks with line comments.',
    tone: 'Technical & Precise',
    tags: ['Code', 'Python'],
    isFavorite: true,
    qualityScore: 92,
    createdAt: new Date().toISOString()
  },
  {
    id: 'saved-2',
    title: 'Cold Outreach Email Optimizer',
    category: 'Marketing',
    targetModel: 'ChatGPT',
    role: 'B2B Sales Specialist',
    goal: 'Draft a high-converting 3-sentence cold email to {{lead_title}} about {{value_prop}}.',
    context: 'Prospect has high open rates but low response rate.',
    constraints: 'Strictly under 75 words. No fluff or buzzwords.',
    tone: 'Direct & Professional',
    tags: ['Marketing', 'Sales'],
    isFavorite: false,
    qualityScore: 88,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  // Theme State
  const [theme, setTheme] = useState(readTheme);
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' | 'library' | 'gallery' | 'sandbox' | 'settings'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Core Builder State
  const [builderState, setBuilderState] = useState({
    title: 'Untitled Masterpiece',
    role: 'Expert System Architect',
    goal: 'Analyze {{topic}} and construct a comprehensive blueprint for {{target_audience}}.',
    context: 'Targeting production deployment with minimal complexity and maximum scalability.',
    constraints: '1. Use bullet points.\n2. Keep output concise.\n3. Include a short summary table at the end.',
    tone: 'Professional & Direct',
    targetModel: 'ChatGPT',
    category: 'Productivity'
  });

  const updateField = (field, value) => setBuilderState((prev) => ({ ...prev, [field]: value }));

  // Dynamic Variable Values for Sandbox & Live Testing
  const [varValues, setVarValues] = useState({});

  // Saved Prompts State (LocalStorage)
  const [savedPrompts, setSavedPrompts] = useState(() => loadSavedPrompts(INITIAL_SAVED_PROMPTS));

  // AI Enhancer & Sandbox States
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedDiff, setEnhancedDiff] = useState(null);
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);
  const [sandboxPrompt, setSandboxPrompt] = useState(null); // null = follow the Builder
  const [sandboxResponse, setSandboxResponse] = useState('');
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);
  const [sandboxTokens, setSandboxTokens] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const [accessCode, setAccessCodeState] = useState(getAccessCode);

  // Refs: toast timer, and one abort controller per AI feature
  const toastTimer = useRef(null);
  const enhanceAbort = useRef(null);
  const sandboxAbort = useRef(null);

  // Cleanup on unmount: stop the toast timer and cancel in-flight requests
  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    enhanceAbort.current?.abort();
    sandboxAbort.current?.abort();
  }, []);

  // Sync Theme to HTML class
  useEffect(() => {
    try { localStorage.setItem('promptcraft_theme', theme); } catch { /* storage unavailable; theme still applies for this session */ }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sync Saved Prompts to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('promptcraft_saved', JSON.stringify(savedPrompts));
    } catch (e) {
      console.error('Failed to save prompts to localStorage', e);
    }
  }, [savedPrompts]);

  // Toast helper (a new toast cancels the previous toast's timer)
  const showToast = (message, type = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // Detect {{variables}} dynamically from all inputs
  const detectedVariables = useMemo(
    () => detectVariables(builderState.role, builderState.goal, builderState.context, builderState.constraints, builderState.tone),
    [builderState.role, builderState.goal, builderState.context, builderState.constraints, builderState.tone]
  );

  // Assembled Prompt String Generation
  const assembledPrompt = useMemo(
    () => assemblePrompt(builderState, varValues),
    [builderState, varValues]
  );

  const wordCount = useMemo(
    () => (assembledPrompt.match(/\S+/g) ?? []).length,
    [assembledPrompt]
  );

  // Compute Health & Quality Score (0 - 100%)
  const qualityMetrics = useMemo(() => {
    let score = 0;
    const feedback = [];
    const breakdown = {
      clarity: 0,
      specificity: 0,
      contextDepth: 0,
      outputConstraints: 0
    };

    // Role check
    if (builderState.role.trim().length > 5) {
      score += 20;
      breakdown.clarity += 20;
    } else {
      feedback.push('Add a clear Role or Persona to set AI expertise.');
    }

    // Goal check
    const goalLen = builderState.goal.trim().length;
    if (goalLen > 25) {
      score += 25;
      breakdown.specificity += 25;
    } else if (goalLen > 10) {
      score += 15;
      breakdown.specificity += 15;
      feedback.push('Expand your Goal with specific deliverables.');
    } else {
      feedback.push('Define a precise Goal or Action statement.');
    }

    // Context check
    const contextLen = builderState.context.trim().length;
    if (contextLen > 30) {
      score += 25;
      breakdown.contextDepth += 25;
    } else if (contextLen > 10) {
      score += 15;
      breakdown.contextDepth += 15;
      feedback.push('Add richer Background Context for better nuance.');
    } else {
      feedback.push('Provide Context regarding the audience or scenario.');
    }

    // Constraints check
    if (builderState.constraints.trim().length > 15) {
      score += 20;
      breakdown.outputConstraints += 20;
    } else {
      feedback.push('Add explicit formatting constraints (e.g. word count, format).');
    }

    // Dynamic Variables bonus
    if (detectedVariables.length > 0) {
      score += 10;
    }

    const finalScore = Math.min(100, score);
    return {
      score: finalScore,
      breakdown,
      feedback: feedback.length > 0 ? feedback : ['✨ Exceptional prompt! High clarity, rich context, and sharp constraints.']
    };
  }, [builderState, detectedVariables]);

  // Single Click Copy
  const handleCopy = async (text, label = 'Prompt') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, 'success');
    } catch {
      showToast('Copy failed: clipboard unavailable or permission denied.', 'error');
    }
  };

  // Magic AI Enhance (calls our own /api/gemini, never Google directly)
  const handleMagicEnhance = async () => {
    enhanceAbort.current?.abort();
    const controller = new AbortController();
    enhanceAbort.current = controller;
    setIsEnhancing(true);
    try {
      const raw = await callGemini({
        mode: 'enhance',
        userQuery: buildEnhanceQuery(builderState),
        signal: controller.signal
      });
      setEnhancedDiff(parseEnhancement(raw, builderState));
      setShowEnhanceModal(true);
      showToast('Magic AI Enhancement generated!', 'success');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('Enhance error:', err?.name);
      const unusable = err instanceof SyntaxError || err?.message?.startsWith('Enhancement response');
      showToast(
        `Enhancement failed: ${unusable ? 'The AI returned an unusable response. Try again.' : userMessage(err)}`,
        'error'
      );
    } finally {
      if (!controller.signal.aborted) setIsEnhancing(false);
    }
  };

  // Apply Enhanced AI Diff
  const applyEnhancedDiff = () => {
    if (!enhancedDiff) return;
    setBuilderState(prev => ({
      ...prev,
      role: enhancedDiff.role || prev.role,
      goal: enhancedDiff.goal || prev.goal,
      context: enhancedDiff.context || prev.context,
      constraints: enhancedDiff.constraints || prev.constraints,
      tone: enhancedDiff.tone || prev.tone,
    }));
    setShowEnhanceModal(false);
    showToast('Applied AI Enhancements!', 'success');
  };

  // Save Current Builder Prompt to Library
  const handleSaveToLibrary = () => {
    const newEntry = {
      id: `saved-${crypto.randomUUID()}`,
      title: builderState.title || 'Untitled Prompt',
      category: builderState.category || 'Productivity',
      targetModel: builderState.targetModel,
      role: builderState.role,
      goal: builderState.goal,
      context: builderState.context,
      constraints: builderState.constraints,
      tone: builderState.tone,
      tags: [builderState.category, builderState.targetModel],
      isFavorite: false,
      qualityScore: qualityMetrics.score,
      createdAt: new Date().toISOString()
    };

    setSavedPrompts(prev => [newEntry, ...prev]);
    showToast('Saved to Prompt Library!', 'success');
  };

  // Run Prompt in AI Sandbox
  const handleRunSandbox = async () => {
    const payload = sandboxPrompt ?? assembledPrompt;
    if (!payload.trim()) {
      showToast('Write a prompt first.', 'error');
      return;
    }
    const unresolved = detectVariables(payload);
    if (unresolved.length > 0) {
      showToast(`Fill in variables first: ${unresolved.join(', ')}`, 'error');
      return;
    }

    sandboxAbort.current?.abort();
    const controller = new AbortController();
    sandboxAbort.current = controller;
    setIsSandboxRunning(true);
    setSandboxResponse('');
    const t0 = performance.now();
    try {
      const text = await callGemini({ mode: 'run', userQuery: payload, signal: controller.signal });
      setSandboxResponse(text);
      setSandboxTokens({
        time: ((performance.now() - t0) / 1000).toFixed(2),
        words: (text.match(/\S+/g) ?? []).length
      });
      showToast('Ran successfully in Gemini Sandbox!', 'success');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('Sandbox execution error:', err?.name);
      setSandboxResponse(`Error: ${userMessage(err)}`);
      showToast('Sandbox execution failed.', 'error');
    } finally {
      if (!controller.signal.aborted) setIsSandboxRunning(false);
    }
  };

  // Export saved prompts as a JSON file (Blob URL, revoked after use)
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(savedPrompts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptcraft_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exported JSON backup!', 'success');
  };

  // Load Template into Builder
  const handleLoadTemplate = (tpl) => {
    setBuilderState({
      title: tpl.title,
      role: tpl.role,
      goal: tpl.goal,
      context: tpl.context,
      constraints: tpl.constraints,
      tone: tpl.tone,
      targetModel: tpl.targetModel,
      category: tpl.category
    });
    setVarValues({});
    setSandboxPrompt(null);
    setActiveTab('builder');
    showToast(`Loaded template: "${tpl.title}"`, 'info');
  };

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-700">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 dark:text-rose-600" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* ENHANCE COMPARISON MODAL */}
      {showEnhanceModal && enhancedDiff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Magic Enhancement</h3>
                  <p className="text-xs text-slate-500">Gemini 3.8 Flash optimized components</p>
                </div>
              </div>
              <button
                onClick={() => setShowEnhanceModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-sm">
              {enhancedDiff.explanation && (
                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200 text-xs leading-relaxed">
                  <strong>AI Insights:</strong> {enhancedDiff.explanation}
                </div>
              )}
              {enhancedDiff.droppedVariables?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs">
                  <strong>Warning:</strong> the AI removed these placeholders: {enhancedDiff.droppedVariables.join(', ')}. Applying will break them.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-2">Original Goal</h4>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{builderState.goal || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                  <h4 className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Enhanced Goal</h4>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{enhancedDiff.goal}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-2">Original Role</h4>
                  <p className="text-slate-700 dark:text-slate-300">{builderState.role || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                  <h4 className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Enhanced Role</h4>
                  <p className="text-slate-800 dark:text-slate-200">{enhancedDiff.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-2">Original Constraints</h4>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{builderState.constraints || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                  <h4 className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Enhanced Constraints</h4>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{enhancedDiff.constraints}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEnhanceModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Discard
              </button>
              <button
                onClick={applyEnhancedDiff}
                className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-none bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent">
                PromptCraft Studio
              </h1>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">AI Productivity Engine</span>
            </div>
          </div>
        </div>

        {/* Quick Actions & Header Info */}
        <div className="flex items-center gap-3">
          {/* Target Model Selector Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs">
            <span className="text-slate-400 font-medium">Model:</span>
            <select
              value={builderState.targetModel}
              onChange={(e) => updateField('targetModel', e.target.value)}
              className="bg-transparent font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
              aria-label="Target model"
            >
              <option value="ChatGPT">ChatGPT (GPT-4o)</option>
              <option value="Claude">Claude 3.5</option>
              <option value="Gemini">Gemini 3.8 Flash</option>
              <option value="Midjourney">Midjourney v6</option>
            </select>
          </div>

          {/* Quality Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Score: {qualityMetrics.score}%</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Toggle Theme"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex min-h-[calc(100vh-57px)]">

        {/* COLLAPSIBLE SIDEBAR */}
        <aside className={`transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm flex flex-col justify-between ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <div className="p-3 space-y-1">

            {/* Nav Links */}
            {[
              { id: 'builder', label: 'Modular Builder', icon: Wand2 },
              { id: 'library', label: 'Saved Library', icon: Bookmark, badge: savedPrompts.length },
              { id: 'gallery', label: 'Template Gallery', icon: LayoutGrid, badge: DEFAULT_TEMPLATES.length },
              { id: 'sandbox', label: 'AI Sandbox', icon: Terminal },
              { id: 'settings', label: 'Settings & Data', icon: SettingsIcon },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!sidebarCollapsed && item.badge !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Info Card */}
          {!sidebarCollapsed && (
            <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/30 text-xs">
              <div className="flex items-center gap-2 font-semibold text-indigo-900 dark:text-indigo-200 mb-1">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Pro Tip
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Use <code className="px-1 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 rounded text-indigo-800 dark:text-indigo-300 font-mono text-[11px]">&#123;&#123;variable&#125;&#125;</code> tags to create reusable dynamic prompts.
              </p>
            </div>
          )}
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto">

          {/* ==================================================== */}
          {/* TAB 1: MODULAR PROMPT BUILDER */}
          {/* ==================================================== */}
          {activeTab === 'builder' && (
            <div className="space-y-6 animate-fadeIn">

              {/* Builder Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <input
                    type="text"
                    value={builderState.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Prompt Title..."
                    aria-label="Prompt title"
                    className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition px-1 py-0.5 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Design modular prompts with dynamic variables & real-time health analysis.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMagicEnhance}
                    disabled={isEnhancing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium text-sm shadow-md shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isEnhancing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    <span>Magic AI Enhance</span>
                  </button>

                  <button
                    onClick={handleSaveToLibrary}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm transition flex items-center gap-2"
                  >
                    <Save className="w-4 h-4 text-indigo-500" />
                    <span>Save Prompt</span>
                  </button>
                </div>
              </div>

              {/* GRID: BUILDER INPUTS (LEFT) vs LIVE PREVIEW (RIGHT) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* LEFT: FORM INPUTS (7 Columns) */}
                <div className="lg:col-span-7 space-y-5">

                  {/* Category & Target Model selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="target-model" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target AI Model</label>
                      <select
                        id="target-model"
                        value={builderState.targetModel}
                        onChange={(e) => updateField('targetModel', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                      >
                        <option value="ChatGPT">ChatGPT (OpenAI)</option>
                        <option value="Claude">Claude (Anthropic)</option>
                        <option value="Gemini">Gemini (Google)</option>
                        <option value="Midjourney">Midjourney / DALL-E</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category Tag</label>
                      <select
                        id="category"
                        value={builderState.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                      >
                        <option value="Productivity">Productivity</option>
                        <option value="Code">Code & Dev</option>
                        <option value="Writing">Writing & Copy</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Learning">Learning & Ed</option>
                        <option value="Design">Design & Art</option>
                      </select>
                    </div>
                  </div>

                  {/* Field 1: Role / Persona */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-role" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-indigo-500" />
                        1. Role / Persona
                      </label>
                      <span className="text-[11px] text-slate-400">Who should the AI act as?</span>
                    </div>
                    <input
                      id="field-role"
                      type="text"
                      value={builderState.role}
                      onChange={(e) => updateField('role', e.target.value)}
                      placeholder="e.g. Senior Software Architect, Patient Socratic Tutor, Copywriter..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['Principal Architect', 'Executive Assistant', 'UX Researcher', 'Science Writer'].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => updateField('role', suggestion)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 text-[11px] text-slate-500 transition"
                        >
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field 2: Goal / Action Statement */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-goal" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500" />
                        2. Goal / Action Statement
                      </label>
                      <span className="text-[11px] text-slate-400">Supports &#123;&#123;variable&#125;&#125; placeholders</span>
                    </div>
                    <textarea
                      id="field-goal"
                      rows={3}
                      value={builderState.goal}
                      onChange={(e) => updateField('goal', e.target.value)}
                      placeholder="What exact task should the AI complete? Use {{topic}} for dynamic fields..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition resize-none"
                    />
                  </div>

                  {/* Field 3: Context & Background */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-context" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        3. Context & Background
                      </label>
                      <span className="text-[11px] text-slate-400">Target audience, domain or scenario constraints</span>
                    </div>
                    <textarea
                      id="field-context"
                      rows={2}
                      value={builderState.context}
                      onChange={(e) => updateField('context', e.target.value)}
                      placeholder="Provide background information, target audience, or constraints context..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition resize-none"
                    />
                  </div>

                  {/* Field 4: Constraints & Output Format */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="field-constraints" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <SlidersHorizontal className="w-4 h-4 text-violet-500" />
                        4. Constraints & Output Format
                      </label>
                      <span className="text-[11px] text-slate-400">Bullet points, length limits, forbidden terms</span>
                    </div>
                    <textarea
                      id="field-constraints"
                      rows={3}
                      value={builderState.constraints}
                      onChange={(e) => updateField('constraints', e.target.value)}
                      placeholder="e.g. 1. Word limit: under 200 words. 2. Output as Markdown table."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition resize-none"
                    />
                  </div>

                  {/* Field 5: Tone & Voice Selection */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      5. Tone & Voice Selection
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        'Professional & Direct',
                        'Diplomatic & Assertive',
                        'Encouraging & Socratic',
                        'Technical & Concise',
                        'Casual & Friendly',
                        'Authoritative & SEO'
                      ].map(t => (
                        <button
                          key={t}
                          onClick={() => updateField('tone', t)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition ${
                            builderState.tone === t
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* RIGHT: ASSEMBLED PREVIEW & HEALTH SCORE (5 Columns) */}
                <div className="lg:col-span-5 space-y-5 sticky top-20">

                  {/* HEALTH & QUALITY SCORE CARD */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">Prompt Health Analysis</h3>
                          <p className="text-[11px] text-slate-400">Completeness checklist (length-based, not a quality judgment)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{qualityMetrics.score}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${qualityMetrics.score}%` }}
                      />
                    </div>

                    {/* Feedback Checklist */}
                    <div className="space-y-1.5 pt-1">
                      {qualityMetrics.feedback.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DYNAMIC VARIABLE INPUT PANEL (IF VARIABLES DETECTED) */}
                  {detectedVariables.length > 0 && (
                    <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wider">
                          <Tag className="w-3.5 h-3.5" />
                          Dynamic Variables Detected ({detectedVariables.length})
                        </div>
                      </div>
                      <div className="space-y-2">
                        {detectedVariables.map((v) => (
                          <div key={v} className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                              &#123;&#123;{v}&#125;&#125;
                            </span>
                            <input
                              type="text"
                              placeholder={`Value for ${v}...`}
                              aria-label={`Value for ${v}`}
                              value={varValues[v] || ''}
                              onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* REAL-TIME PROMPT ASSEMBLER PREVIEW */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-900 text-slate-100 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-xs tracking-wider uppercase text-slate-300">Assembled Prompt</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(assembledPrompt)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                          title="Copy text"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </button>
                        <button
                          onClick={() => {
                            setSandboxPrompt(assembledPrompt);
                            setActiveTab('sandbox');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center gap-1.5"
                          title="Test in Sandbox"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Test
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto pr-1">
                      <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-slate-200">
                        {assembledPrompt}
                      </pre>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Chars: {assembledPrompt.length}</span>
                      <span>Words: {wordCount}</span>
                      <span>Target: {builderState.targetModel}</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: SAVED LIBRARY */}
          {/* ==================================================== */}
          {activeTab === 'library' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-bold">Saved Prompts Library</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage, search, tag, and export your personal collection of optimized prompts.</p>
                </div>
                <button
                  onClick={() => {
                    setBuilderState({
                      title: 'New Custom Prompt',
                      role: '',
                      goal: '',
                      context: '',
                      constraints: '',
                      tone: 'Professional & Direct',
                      targetModel: 'ChatGPT',
                      category: 'Productivity'
                    });
                    setVarValues({});
                    setSandboxPrompt(null);
                    setActiveTab('builder');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition flex items-center gap-2 self-start"
                >
                  <Plus className="w-4 h-4" />
                  Create New Prompt
                </button>
              </div>

              {/* SAVED CARDS GRID */}
              {savedPrompts.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                  <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300">No saved prompts yet</h3>
                  <p className="text-xs text-slate-400 mt-1">Build a prompt and click "Save Prompt" to build your collection.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {savedPrompts.map((p) => (
                    <div key={p.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">{p.title}</h3>
                          <button
                            onClick={() => {
                              setSavedPrompts(prev => prev.map(sp => sp.id === p.id ? { ...sp, isFavorite: !sp.isFavorite } : sp));
                            }}
                            className="p-1 text-slate-300 hover:text-amber-400 transition"
                            aria-label="Toggle favorite"
                          >
                            <Star className={`w-4 h-4 ${p.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                            {p.targetModel}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium">
                            {p.category}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {p.goal || p.role}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">Score: {p.qualityScore}%</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setBuilderState({
                                title: p.title,
                                role: p.role,
                                goal: p.goal,
                                context: p.context,
                                constraints: p.constraints,
                                tone: p.tone,
                                targetModel: p.targetModel,
                                category: p.category
                              });
                              setVarValues({});
                              setSandboxPrompt(null);
                              setActiveTab('builder');
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                            title="Edit in Builder"
                            aria-label="Edit in Builder"
                          >
                            <Wand2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const full = `Role: ${p.role}\nGoal: ${p.goal}\nContext: ${p.context}\nConstraints: ${p.constraints}\nTone: ${p.tone}`;
                              handleCopy(full, p.title);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                            title="Copy prompt"
                            aria-label="Copy prompt"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSavedPrompts(prev => prev.filter(sp => sp.id !== p.id))}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500 transition"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: TEMPLATE GALLERY */}
          {/* ==================================================== */}
          {activeTab === 'gallery' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-bold">Curated Template Gallery</h2>
                <p className="text-xs text-slate-500 mt-1">Prompt blueprints for code, writing, executive tasks, and education.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {DEFAULT_TEMPLATES.map((tpl) => (
                  <div key={tpl.id} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold tracking-wider uppercase">
                            {tpl.category}
                          </span>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-1.5">{tpl.title}</h3>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{tpl.rating}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                        <p className="text-slate-700 dark:text-slate-300 font-medium"><strong>Role:</strong> {tpl.role}</p>
                        <p className="text-slate-600 dark:text-slate-400 line-clamp-2"><strong>Goal:</strong> {tpl.goal}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Optimized for: {tpl.targetModel}</span>
                      <button
                        onClick={() => handleLoadTemplate(tpl)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition flex items-center gap-1.5"
                      >
                        <span>Use Template</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: AI SANDBOX */}
          {/* ==================================================== */}
          {activeTab === 'sandbox' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Gemini AI Sandbox</h2>
                  <p className="text-xs text-slate-500 mt-1">Test your assembled prompts live against Gemini 3.8 Flash model in real-time.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Input Prompt Box */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="sandbox-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-500" />
                      Input Prompt Payload
                    </label>
                    <button
                      onClick={() => setSandboxPrompt(null)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Sync with Builder
                    </button>
                  </div>

                  <textarea
                    id="sandbox-input"
                    rows={12}
                    value={sandboxPrompt ?? assembledPrompt}
                    onChange={(e) => setSandboxPrompt(e.target.value)}
                    placeholder="Paste or write prompt payload here..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition resize-none leading-relaxed"
                  />

                  <button
                    onClick={handleRunSandbox}
                    disabled={isSandboxRunning}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium text-sm shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSandboxRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Running in Gemini 3.8 Flash...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Run Prompt Payload</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Output Sandbox Box */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 shadow-xl space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-xs tracking-wider uppercase text-slate-300">Live AI Output</span>
                      </div>
                      {sandboxResponse && (
                        <button
                          onClick={() => handleCopy(sandboxResponse, 'AI Response')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Output
                        </button>
                      )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto pr-2">
                      {isSandboxRunning ? (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                          <p className="text-xs font-medium">Generating intelligent response...</p>
                        </div>
                      ) : sandboxResponse ? (
                        <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-200">
                          {sandboxResponse}
                        </pre>
                      ) : (
                        <div className="py-16 text-center text-slate-500 text-xs">
                          Click "Run Prompt Payload" to execute against Gemini AI.
                        </div>
                      )}
                    </div>
                  </div>

                  {sandboxTokens && (
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Latency: {sandboxTokens.time}s</span>
                      <span>Output words: {sandboxTokens.words}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: SETTINGS */}
          {/* ==================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl animate-fadeIn">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-bold">Settings & Data Management</h2>
                <p className="text-xs text-slate-500 mt-1">Configure workspace defaults, export data backups, or restore factory defaults.</p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-semibold text-sm">AI Access Code</h3>
                    <p className="text-xs text-slate-400">Required for Magic Enhance and the Sandbox. Kept for this browser session only.</p>
                  </div>
                  <input
                    type="password"
                    value={accessCode}
                    onChange={(e) => { setAccessCodeState(e.target.value); setAccessCode(e.target.value); }}
                    placeholder="Enter code"
                    aria-label="AI access code"
                    className="w-44 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Theme Selector */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-semibold text-sm">Interface Appearance</h3>
                    <p className="text-xs text-slate-400">Choose your preferred light or dark palette</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${theme === 'light' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      Light Mode
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${theme === 'dark' ? 'border-indigo-600 bg-indigo-950 text-indigo-400' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      Dark Mode
                    </button>
                  </div>
                </div>

                {/* Export Data */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-semibold text-sm">Export Saved Prompts Backup</h3>
                    <p className="text-xs text-slate-400">Download all saved prompts as JSON file</p>
                  </div>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON
                  </button>
                </div>

                {/* Clear Local Storage */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-rose-600 dark:text-rose-400">Reset Local Storage</h3>
                    <p className="text-xs text-slate-400">Reset saved prompts to initial default state</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Reset saved prompts to factory default?')) {
                        setSavedPrompts(INITIAL_SAVED_PROMPTS);
                        try { localStorage.removeItem('promptcraft_saved'); } catch { /* storage unavailable */ }
                        showToast('Reset to default library state.', 'info');
                      }
                    }}
                    className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-medium transition flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset Prompts
                  </button>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}