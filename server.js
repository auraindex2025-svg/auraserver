// ================================
// IMPORTS (TODOS AL PRINCIPIO)
// ================================
import express from "express";
import crypto from "crypto";
import stableStringify from "json-stable-stringify";
import { createClient } from "@supabase/supabase-js";
import { analyzeMetadata, extractEvidenceMetadata } from './metadata-analyzer.js';

// ================================
// CONFIGURACIÓN BÁSICA
// ================================
const app = express();

/**
 * 🔓 CORS SIMPLE (DESARROLLO)
 * Permite cualquier origen y maneja preflight OPTIONS
 */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '10mb' }));

// ================================
// INICIALIZACIÓN SUPABASE
// ================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ================================
// FUNCIONES AUXILIARES (INMUTABLES)
// ================================

function calculateSHA256Deterministic(obj) {
  const stable = stableStringify(obj);
  return crypto.createHash("sha256").update(stable).digest("hex");
}

function generateCaseId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AURA-${year}-${month}-${rand}`;
}

function validateProtocolMetadata(intake) {
  if (
    !intake?.aura_protocol ||
    !intake.aura_protocol.phase ||
    !intake.aura_protocol.version ||
    !intake.aura_protocol.generated_at
  ) {
    throw new Error("Falta metadata de protocolo AURA");
  }

  if (intake.aura_protocol.version !== "1.0.0") {
    throw new Error("Versión de protocolo no soportada");
  }
}

// ================================
// ENDPOINT ÚNICO — INGESTA FORENSE
// ================================

app.post("/intake-freeze", async (req, res) => {
  try {
    const { intake_data, client_hash } = req.body;

    if (!intake_data || !client_hash) {
      return res.status(400).json({
        error: "DATOS_INCOMPLETOS",
        required: ["intake_data", "client_hash"]
      });
    }

    // 1️⃣ Validar SOLO protocolo
    validateProtocolMetadata(intake_data);

    // 2️⃣ Calcular server_hash (determinista)
    const server_hash = calculateSHA256Deterministic(intake_data);

    // 3️⃣ Insertar intake_frozen (evidencia primaria)
    const { data: frozen, error: frozenError } = await supabase
      .from("intake_frozen")
      .insert({
        aura_intake_json: intake_data,
        client_hash,
        server_hash,
        hash_match: client_hash === server_hash
      })
      .select("id, received_at")
      .single();

    if (frozenError) {
      if (frozenError.code === "23505") {
        return res.status(409).json({
          error: "DECLARACION_DUPLICADA"
        });
      }
      throw frozenError;
    }

    // 4️⃣ Crear audit_case
    const case_id = generateCaseId();

    const original_git =
      intake_data.genesis_declaration?.declared_git_level ?? 0;

    const original_cg =
      intake_data.forensic_pre_evaluation?.pre_confidence_grade ?? "CG-?";

    const { error: caseError } = await supabase
      .from("audit_cases")
      .insert({
        case_id,
        intake_frozen_id: frozen.id,
        original_git,
        original_cg,
        intake_hash: server_hash,
        status: "draft"
      });

    if (caseError) throw caseError;

    // 5️⃣ Escribir audit_log
    const { error: logError } = await supabase
      .from("audit_logs")
      .insert({
        case_id,
        action: "intake_frozen",
        details: {
          intake_frozen_id: frozen.id,
          hash_match: client_hash === server_hash
        },
        actor_type: "system",
        actor_id: "render-intake-service"
      });

    if (logError) throw logError;

    // 6️⃣ Respuesta mínima
    return res.status(201).json({
      success: true,
      case_id
    });

  } catch (err) {
    console.error("ERROR INGESTA:", err.message);

    return res.status(500).json({
      error: "ERROR_INTERNO_SISTEMA"
    });
  }
});

// ================================
// ENDPOINT 2.2 - ANÁLISIS DE METADATOS (CORREGIDO)
// ================================

app.post("/analysis/metadata", async (req, res) => {
  // 🚫 DECLARACIÓN DE NO-DECISIÓN (en logs)
  console.log('===========================================');
  console.log('ANÁLISIS DE METADATOS - FASE 2.2');
  console.log('Sistema no-decisorio: Solo lectura técnica');
  console.log('No valida autenticidad. No determina uso de IA.');
  console.log('===========================================');
  
  try {
    const { case_id, file_url } = req.body;

    if (!case_id) {
      return res.status(400).json({
        error: "PARAMETROS_INCOMPLETOS",
        required: ["case_id"]
      });
    }

    // 1️⃣ Obtener caso y evidencia congelada (SOLO LECTURA)
    const { data: auditCase, error: caseError } = await supabase
      .from("audit_cases")
      .select(`
        *,
        intake_frozen (
          aura_intake_json
        )
      `)
      .eq("case_id", case_id)
      .single();

    if (caseError || !auditCase) {
      return res.status(404).json({
        error: "CASO_NO_ENCONTRADO"
      });
    }

    // 2️⃣ Ejecutar análisis no-decisorio
    const intake_json = auditCase.intake_frozen.aura_intake_json;
    
    const analysisResult = await analyzeMetadata({
      case_id,
      intake_json,
      file_url
    });

    // 3️⃣ Registrar en audit_logs (solo traza técnica)
    const { error: logError } = await supabase
      .from("audit_logs")
      .insert({
        case_id,
        action: "metadata_analysis_executed",
        details: {
          flags_count: analysisResult.metadata_flags.length,
          flags: analysisResult.metadata_flags,
          analysis_version: analysisResult.analysis_version,
          internal_analysis_id: crypto.randomUUID()
        },
        actor_type: "system",
        actor_id: "metadata-analyzer-v2.2"
      });

    if (logError) {
      console.error("Error registrando log de análisis:", logError);
      // 🚫 NO FALLAMOS - el análisis se completó
    }

    // 4️⃣ Respuesta normalizada (EXACTAMENTE 4 CAMPOS)
    return res.status(200).json(analysisResult);

  } catch (err) {
    console.error("ERROR en endpoint de análisis:", err.message);
    
    // 🚫 ERROR CONTROLADO - nunca exponemos detalles internos
    return res.status(500).json({
      error: "ERROR_ANALISIS_TECNICO",
      message: "Fallo en análisis de metadatos. Sistema no-decisorio."
    });
  }
});

// ================================
// BLOQUE 3.1 — EVIDENCE METADATA FORENSICS
// ================================

app.post("/analysis/metadata-extract", async (req, res) => {
  // 🚫 DECLARACIÓN DE NO-DECISIÓN
  console.log('===========================================');
  console.log('BLOQUE 3.1 — EVIDENCE METADATA FORENSICS');
  console.log('Sistema no-decisorio: Solo extracción técnica');
  console.log('No valida autenticidad. No determina uso de IA.');
  console.log('===========================================');

  try {
    const { case_id, evidences } = req.body;

    if (!case_id || !evidences || !Array.isArray(evidences)) {
      return res.status(400).json({
        error: "PARAMETROS_INCOMPLETOS",
        required: ["case_id", "evidences"]
      });
    }

    // 1️⃣ Obtener caso (SOLO LECTURA)
    const { data: auditCase, error: caseError } = await supabase
      .from("audit_cases")
      .select("case_id")
      .eq("case_id", case_id)
      .single();

    if (caseError || !auditCase) {
      return res.status(404).json({
        error: "CASO_NO_ENCONTRADO"
      });
    }

    let processedCount = 0;
    const processingErrors = [];

    // 2️⃣ Procesar cada evidencia
    for (const evidence of evidences) {
      const { evidence_id, file_url } = evidence;
      
      if (!evidence_id || !file_url) {
        processingErrors.push({ evidence_id, error: "Campos incompletos" });
        continue;
      }

      try {
        // 3️⃣ Extraer metadatos técnicos
        const extractionResult = await extractEvidenceMetadata(file_url);
        
        // 4️⃣ Persistir en evidence_metadata (SOLO HECHOS)
        const { error: insertError } = await supabase
          .from("evidence_metadata")
          .insert({
            case_id,
            evidence_id,
            metadata: extractionResult.metadata,
            extraction_version: extractionResult.extraction_version,
            extracted_at: extractionResult.extracted_at || new Date().toISOString()
          });

        if (insertError) {
          processingErrors.push({ evidence_id, error: insertError.message });
          console.error(`Error insertando metadatos para ${evidence_id}:`, insertError.message);
        } else {
          processedCount++;
          console.log(`Metadatos extraídos para evidencia: ${evidence_id}`);
        }

      } catch (error) {
        processingErrors.push({ evidence_id, error: error.message });
        console.error(`Error procesando evidencia ${evidence_id}:`, error.message);
        // 🚫 CONTINUAMOS - no fallamos el proceso completo
      }
    }

    // 5️⃣ Registrar en audit_logs
    const { error: logError } = await supabase
      .from("audit_logs")
      .insert({
        case_id,
        action: "metadata_extracted",
        details: {
          evidences_processed: processedCount,
          total_evidences: evidences.length,
          errors: processingErrors.length > 0 ? processingErrors : undefined
        },
        actor_type: "system",
        actor_id: "evidence-metadata-forensics-3.1"
      });

    if (logError) {
      console.error("Error registrando log de extracción:", logError);
      // 🚫 NO FALLAMOS - el proceso se completó
    }

    // 6️⃣ Respuesta normalizada
    return res.status(200).json({
      case_id,
      evidences_processed: processedCount,
      metadata_extracted: processedCount > 0
    });

  } catch (err) {
    console.error("ERROR en extracción de metadatos:", err.message);
    
    return res.status(500).json({
      error: "ERROR_EXTRACCION_METADATOS",
      message: "Fallo en extracción de metadatos. Sistema no-decisorio."
    });
  }
});

// ================================
// BLOQUE 3.2 — AI SIGNAL DETECTION LAYER
// ================================

// 🧠 Técnicas de IA simuladas (en producción se integrarían modelos reales)
const aiSignalTechniques = {
  // 1️⃣ CLIP Similarity
  clip_similarity: () => ({
    score: Math.random() * 0.3 + 0.5, // 0.5-0.8
    reliability: 0.6
  }),

  // 2️⃣ Noise / Residual Analysis
  noise_analysis: () => ({
    score: Math.random() * 0.4 + 0.4, // 0.4-0.8
    reliability: 0.7
  }),

  // 3️⃣ Frequency / Spectral Analysis
  spectral_analysis: () => ({
    score: Math.random() * 0.5 + 0.3, // 0.3-0.8
    reliability: 0.6
  }),

  // 4️⃣ Model Fingerprinting
  model_fingerprinting: (metadata) => {
    const knownModels = ["Stable Diffusion", "DALL-E", "Midjourney", "Adobe Firefly"];
    const detected = metadata.software ? 
      knownModels.find(model => metadata.software.includes(model)) : null;
    
    return {
      score: detected ? 0.8 : 0.2,
      reliability: detected ? 0.9 : 0.3,
      model: detected || "No detectable"
    };
  },

  // 5️⃣ Dataset Resemblance
  dataset_resemblance: () => ({
    score: Math.random() * 0.5 + 0.2, // 0.2-0.7
    reliability: 0.5
  })
};

// Función para calcular agregación ponderada
function calculateWeightedAggregation(signals) {
  let totalScore = 0;
  let totalReliability = 0;
  
  Object.values(signals).forEach(signal => {
    if (signal && typeof signal.score === 'number' && typeof signal.reliability === 'number') {
      totalScore += signal.score * signal.reliability;
      totalReliability += signal.reliability;
    }
  });
  
  return totalReliability > 0 ? totalScore / totalReliability : 0;
}

// Función para calcular confianza
function calculateConfidence(signals, metadataIntegrity) {
  const scores = Object.values(signals)
    .filter(s => s && typeof s.score === 'number')
    .map(s => s.score);
  
  if (scores.length === 0) return "LOW";
  
  // Calcular varianza
  const mean = scores.reduce((a, b) => a + b) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  
  // Factores para confianza
  const scoreCount = scores.length;
  const lowVariance = variance < 0.05;
  const highReliability = Object.values(signals)
    .filter(s => s && s.reliability > 0.7).length >= 3;
  
  if (scoreCount >= 4 && lowVariance && highReliability && metadataIntegrity) {
    return "HIGH";
  } else if (scoreCount >= 3 && metadataIntegrity) {
    return "MEDIUM";
  } else {
    return "LOW";
  }
}

app.post("/analysis/ai-signals", async (req, res) => {
  // 🚫 DECLARACIÓN DE NO-DECISIÓN
  console.log('===========================================');
  console.log('BLOQUE 3.2 — AI SIGNAL DETECTION LAYER');
  console.log('Sistema no-decisorio: Solo señales auxiliares');
  console.log('NO valida autenticidad. NO determina uso de IA.');
  console.log('===========================================');

  try {
    const { case_id } = req.body;

    if (!case_id) {
      return res.status(400).json({
        error: "PARAMETROS_INCOMPLETOS",
        required: ["case_id"]
      });
    }

    // 1️⃣ Obtener caso (SOLO LECTURA)
    const { data: auditCase, error: caseError } = await supabase
      .from("audit_cases")
      .select("case_id")
      .eq("case_id", case_id)
      .single();

    if (caseError || !auditCase) {
      return res.status(404).json({
        error: "CASO_NO_ENCONTRADO"
      });
    }

    // 2️⃣ Obtener metadatos extraídos
    const { data: evidenceMetadata, error: metadataError } = await supabase
      .from("evidence_metadata")
      .select("*")
      .eq("case_id", case_id)
      .order("extracted_at", { ascending: false })
      .limit(1);

    if (metadataError || !evidenceMetadata || evidenceMetadata.length === 0) {
      return res.status(400).json({
        error: "METADATOS_NO_DISPONIBLES",
        message: "Primero ejecute la extracción de metadatos (BLOQUE 3.1)"
      });
    }

    const metadata = evidenceMetadata[0].metadata;
    const metadataIntegrity = Object.keys(metadata).length > 5; // Heurística simple

    // 3️⃣ Ejecutar técnicas de IA independientes
    const ai_signals = {
      clip: aiSignalTechniques.clip_similarity(),
      noise: aiSignalTechniques.noise_analysis(),
      spectral: aiSignalTechniques.spectral_analysis(),
      fingerprint: aiSignalTechniques.model_fingerprinting(metadata),
      dataset: aiSignalTechniques.dataset_resemblance()
    };

    // 4️⃣ Calcular agregación (INTERNO, no decisorio)
    const aggregated_score = calculateWeightedAggregation(ai_signals);
    const confidence = calculateConfidence(ai_signals, metadataIntegrity);

    // 5️⃣ Persistir en ai_signal_results
    const { error: insertError } = await supabase
      .from("ai_signal_results")
      .insert({
        case_id,
        ai_signals,
        aggregated_score,
        confidence,
        analysis_version: "3.2.0",
        analyzed_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("Error insertando resultados de señales de IA:", insertError);
      // 🚫 NO FALLAMOS - continuamos
    }

    // 6️⃣ Registrar en audit_logs
    const { error: logError } = await supabase
      .from("audit_logs")
      .insert({
        case_id,
        action: "ai_signal_analysis_executed",
        details: {
          signals_count: Object.keys(ai_signals).length,
          aggregated_score,
          confidence,
          metadata_integrity: metadataIntegrity
        },
        actor_type: "system",
        actor_id: "ai-signal-detection-3.2"
      });

    if (logError) {
      console.error("Error registrando log de análisis:", logError);
      // 🚫 NO FALLAMOS - el análisis se completó
    }

    // 7️⃣ Respuesta normalizada
    return res.status(200).json({
      case_id,
      ai_signals,
      aggregated_score,
      confidence,
      analysis_version: "3.2.0"
    });

  } catch (err) {
    console.error("ERROR en detección de señales de IA:", err.message);
    
    return res.status(500).json({
      error: "ERROR_DETECCION_SEÑALES_IA",
      message: "Fallo en detección de señales de IA. Sistema no-decisorio."
    });
  }
});

// ================================
// HEALTH CHECK
// ================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "aura-forensic-service",
    version: "3.0.0",
    blocks_available: ["2.2", "3.1", "3.2"]
  });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`AURA Forensic Service running on port ${PORT}`);
  console.log(`BLOQUE 3 implementado: 3.1 (Metadata Forensics) y 3.2 (AI Signal Detection)`);
  console.log(`🚫 SISTEMA NO-DECISORIO: Solo genera hechos técnicos y señales auxiliares`);
});
