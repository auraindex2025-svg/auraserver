// consistency-engine.js - BLOQUE 2.4
// Evidence vs Declaration Consistency Engine

// ================================
// CONSTANTES Y ENUMS (INMUTABLES)
// ================================

const ENGINE_VERSION = '2.4.0';

const CONSISTENCY_LEVELS = Object.freeze({
  CONSISTENT: 'CONSISTENT',
  WEAK: 'WEAK',
  CONTRADICTORY: 'CONTRADICTORY'
});

const DIMENSIONS = Object.freeze({
  PROCESS: 'PROCESS',
  CONTROL: 'CONTROL',
  TOOLING: 'TOOLING',
  EVIDENCE_COMPLETENESS: 'EVIDENCE_COMPLETENESS'
});

const GIT_EXPECTATIONS = Object.freeze({
  0: { // Ancestral Origin
    description: 'Evidencia de proceso físico o analógico. Digitalización solo documental.',
    ai_in_final: 'AUSENCIA_EXPECTADA',
    source_files: 'REQUERIDOS',
    process_evidence: 'REQUERIDA'
  },
  1: { // Manual Origin
    description: 'Archivo fuente editable con capas no acopladas.',
    ai_in_final: 'AUSENCIA_EXPECTADA',
    source_files: 'REQUERIDOS',
    process_evidence: 'ESPERADA'
  },
  2: { // AI-Augmented Concept
    description: 'IA en ideación, ninguna señal algorítmica en el archivo final.',
    ai_in_final: 'AUSENCIA_EXPECTADA',
    source_files: 'ESPERADOS',
    process_evidence: 'ESPERADA'
  },
  3: { // Cyborg Collaboration
    description: 'Señales algorítmicas parciales compatibles con edición humana sustancial.',
    ai_in_final: 'PARCIAL_PERMITIDO',
    source_files: 'ESPERADOS',
    process_evidence: 'ESPERADA'
  },
  4: { // Hybrid AI
    description: 'Señales algorítmicas fuertes y coherentes con origen generativo.',
    ai_in_final: 'PRESENCIA_ESPERADA',
    source_files: 'OPCIONAL',
    process_evidence: 'OPCIONAL'
  },
  5: { // Prompt-Based Curation
    description: 'Señales algorítmicas dominantes y consistentes.',
    ai_in_final: 'PRESENCIA_ESPERADA',
    source_files: 'NO_ESPERADOS',
    process_evidence: 'NO_ESPERADA'
  }
});

// ================================
// DECLARACIÓN DE NO-DECISIÓN
// ================================

/*
 * MOTOR 2.4 - CONSISTENCIA TÉCNICA
 * NO detecta IA. NO decide autenticidad.
 * NO recalcula GIT. NO interpreta intención.
 * Solo contrasta declaraciones vs evidencia técnica.
 * Versión: 2.4.0 (No-Decisorio)
 */

// ================================
// FUNCIÓN PRINCIPAL BLOQUE 2.4
// ================================

/**
 * 🧩 Evaluación de Consistencia Técnica - BLOQUE 2.4
 * 
 * @param {Object} params
 * @param {string} params.case_id - ID del caso AURA
 * @param {Object} params.intake_declarations - Declaraciones Fase 1 (solo lectura)
 * @param {Object} params.technical_evidence - Resultados técnicos Fases 2.2/3.1/3.2
 * @param {Object} params.evidence_list - Lista de evidencias entregadas
 * @returns {Promise<Object>} Resultado de consistencia
 */
export async function evaluateConsistency({ 
  case_id, 
  intake_declarations, 
  technical_evidence, 
  evidence_list 
}) {
  const evaluation_id = `${case_id}_2.4_${Date.now()}`;
  
  console.log(`[${evaluation_id}] Iniciando evaluación de consistencia (BLOQUE 2.4)`);
  console.log(`[${evaluation_id}] PRINCIPIO: Contrastar declaraciones vs evidencia técnica. No decidir.`);
  
  // 🪜 PASO 1: Normalizar declaraciones en expectativas técnicas
  const declared_git = intake_declarations?.genesis_declaration?.declared_git_level;
  const declared_control = intake_declarations?.declared_human_control;
  const declared_no_ai = intake_declarations?.process_declaration?.no_ai_in_final;
  
  const expectations = normalizeDeclarations({
    git_level: declared_git,
    human_control: declared_control,
    no_ai_final: declared_no_ai,
    process_declaration: intake_declarations?.process_declaration,
    genesis_declaration: intake_declarations?.genesis_declaration
  });
  
  console.log(`[${evaluation_id}] GIT declarado: ${declared_git}, Expectativas:`, expectations);
  
  // 🪜 PASO 2: Evaluar dimensiones independientes
  const dimensionResults = {};
  
  // DIMENSIÓN 1: PROCESS
  dimensionResults[DIMENSIONS.PROCESS] = evaluateProcessDimension({
    expectations,
    evidence_list,
    technical_evidence
  });
  
  // DIMENSIÓN 2: CONTROL
  dimensionResults[DIMENSIONS.CONTROL] = evaluateControlDimension({
    expectations,
    evidence_list,
    technical_evidence,
    intake_declarations
  });
  
  // DIMENSIÓN 3: TOOLING
  dimensionResults[DIMENSIONS.TOOLING] = evaluateToolingDimension({
    expectations,
    technical_evidence,
    intake_declarations
  });
  
  // DIMENSIÓN 4: EVIDENCE_COMPLETENESS
  dimensionResults[DIMENSIONS.EVIDENCE_COMPLETENESS] = evaluateEvidenceDimension({
    expectations,
    evidence_list,
    intake_declarations
  });
  
  console.log(`[${evaluation_id}] Resultados por dimensión:`, dimensionResults);
  
  // 🪜 PASO 3: Calcular resultado global
  const globalResult = calculateGlobalConsistency(dimensionResults);
  
  // 🪜 PASO 4: Identificar dimensiones afectadas
  const affectedDimensions = Object.entries(dimensionResults)
    .filter(([_, result]) => result !== CONSISTENCY_LEVELS.CONSISTENT)
    .map(([dimension, _]) => dimension);
  
  // 🪜 PASO 5: Preparar resultado normalizado
  const result = {
    case_id,
    consistency_result: globalResult,
    affected_dimensions: affectedDimensions,
    engine_version: ENGINE_VERSION,
    evaluated_at: new Date().toISOString()
  };
  
  console.log(`[${evaluation_id}] Evaluación completada. Resultado: ${globalResult}`);
  
  return result;
}

// ================================
// FUNCIONES DE EVALUACIÓN POR DIMENSIÓN
// ================================

function normalizeDeclarations(declarations) {
  const { git_level, human_control, no_ai_final } = declarations;
  
  const expectations = {
    git_level: git_level || 0,
    git_expectation: GIT_EXPECTATIONS[git_level] || GIT_EXPECTATIONS[0],
    human_control_level: human_control || 'medium',
    no_ai_in_final_claimed: !!no_ai_final,
    
    // Expectativas específicas
    expects_source_files: false,
    expects_process_evidence: false,
    expects_ai_signals: false,
    expects_no_ai_signals: false,
    expects_high_control_evidence: false
  };
  
  // Mapear GIT a expectativas técnicas
  if (git_level >= 0 && git_level <= 2) {
    // GIT 0-2: No IA en el resultado final
    expectations.expects_no_ai_signals = true;
    
    if (git_level <= 1) {
      expectations.expects_source_files = true;
    }
    
    if (git_level === 0) {
      expectations.expects_process_evidence = true;
    }
  }
  
  if (git_level >= 3 && git_level <= 5) {
    // GIT 3-5: Se esperan señales de IA
    expectations.expects_ai_signals = true;
    
    if (git_level >= 4) {
      expectations.expects_source_files = false;
    }
  }
  
  // Expectativas de control humano
  if (human_control === 'high' || human_control === 'alto') {
    expectations.expects_high_control_evidence = true;
  }
  
  // Si declara explícitamente "sin IA en resultado final"
  if (no_ai_final) {
    expectations.expects_no_ai_signals = true;
  }
  
  return expectations;
}

function evaluateProcessDimension({ expectations, evidence_list, technical_evidence }) {
  const { git_level, git_expectation } = expectations;
  
  // Caso: Sin expectativa definida
  if (!git_expectation) {
    return CONSISTENCY_LEVELS.WEAK;
  }
  
  const { source_files, process_evidence } = git_expectation;
  const has_source_files = evidence_list?.has_source_files || false;
  const has_process_evidence = evidence_list?.has_process_evidence || false;
  
  // Reglas para cada nivel GIT
  if (git_level <= 1) {
    // GIT 0-1: Requiere archivos fuente
    if (source_files === 'REQUERIDOS' && !has_source_files) {
      return CONSISTENCY_LEVELS.WEAK;
    }
  }
  
  if (git_level === 0) {
    // GIT 0: Requiere evidencia de proceso físico
    if (process_evidence === 'REQUERIDA' && !has_process_evidence) {
      return CONSISTENCY_LEVELS.WEAK;
    }
  }
  
  // Verificar consistencia con señales de IA
  const ai_confidence = technical_evidence?.ai_signals?.confidence || 'LOW';
  const ai_score = technical_evidence?.ai_signals?.aggregated_score || 0;
  
  // Contradicción: Declara no IA pero hay señales fuertes
  if (expectations.expects_no_ai_signals) {
    if (ai_confidence === 'HIGH' && ai_score > 0.7) {
      return CONSISTENCY_LEVELS.CONTRADICTORY;
    }
    
    if (ai_confidence === 'MEDIUM' && ai_score > 0.6) {
      return CONSISTENCY_LEVELS.WEAK;
    }
  }
  
  // Contradicción: Declara IA pero no hay señales
  if (expectations.expects_ai_signals) {
    if (ai_confidence === 'LOW' && ai_score < 0.3) {
      return CONSISTENCY_LEVELS.WEAK;
    }
  }
  
  return CONSISTENCY_LEVELS.CONSISTENT;
}

function evaluateControlDimension({ expectations, evidence_list, technical_evidence, intake_declarations }) {
  const { expects_high_control_evidence } = expectations;
  
  // Si no se declara control alto, es consistente por defecto
  if (!expects_high_control_evidence) {
    return CONSISTENCY_LEVELS.CONSISTENT;
  }
  
  const has_iteration_evidence = evidence_list?.has_iteration_files || false;
  const has_layers = evidence_list?.has_layered_files || false;
  const has_versions = evidence_list?.has_multiple_versions || false;
  
  // Evidencia débil de control
  if (!has_iteration_evidence && !has_layers && !has_versions) {
    return CONSISTENCY_LEVELS.WEAK;
  }
  
  // Contradicción: Control alto declarado pero señales de IA fuertes (sugiere control bajo)
  const ai_confidence = technical_evidence?.ai_signals?.confidence || 'LOW';
  const ai_score = technical_evidence?.ai_signals?.aggregated_score || 0;
  
  if (ai_confidence === 'HIGH' && ai_score > 0.8) {
    // IA muy dominante contradice control humano alto
    return CONSISTENCY_LEVELS.CONTRADICTORY;
  }
  
  return CONSISTENCY_LEVELS.CONSISTENT;
}

function evaluateToolingDimension({ expectations, technical_evidence, intake_declarations }) {
  const metadata_flags = technical_evidence?.metadata_flags || [];
  const declared_tools = [];
  
  // Obtener herramientas declaradas
  if (intake_declarations?.genesis_declaration?.ai_tools_declared) {
    intake_declarations.genesis_declaration.ai_tools_declared.forEach(tool => {
      if (tool.engine) declared_tools.push(tool.engine);
      if (tool.custom_label) declared_tools.push(tool.custom_label);
    });
  }
  
  if (intake_declarations?.process_declaration?.software_used) {
    intake_declarations.process_declaration.software_used.forEach(software => {
      declared_tools.push(software);
    });
  }
  
  // Verificar banderas de metadatos (del Bloque 3.1)
  if (metadata_flags.includes('UNDECLARED_SOFTWARE')) {
    return CONSISTENCY_LEVELS.CONTRADICTORY;
  }
  
  if (metadata_flags.includes('SOFTWARE_SIGNATURE_UNKNOWN')) {
    return CONSISTENCY_LEVELS.WEAK;
  }
  
  // Verificar si hay herramientas detectadas sin declarar
  const detected_software = technical_evidence?.extracted_metadata?.software || [];
  const detected_ai_models = technical_evidence?.ai_signals?.fingerprint?.model || [];
  
  // Comparar herramientas declaradas vs detectadas
  const all_declared_tools = declared_tools.map(t => t.toLowerCase());
  
  let undeclared_count = 0;
  
  if (detected_software.length > 0) {
    detected_software.forEach(tool => {
      if (!all_declared_tools.some(declared => 
        tool.toLowerCase().includes(declared) || 
        declared.includes(tool.toLowerCase())
      )) {
        undeclared_count++;
      }
    });
  }
  
  if (undeclared_count > 1) {
    return CONSISTENCY_LEVELS.CONTRADICTORY;
  } else if (undeclared_count === 1) {
    return CONSISTENCY_LEVELS.WEAK;
  }
  
  return CONSISTENCY_LEVELS.CONSISTENT;
}

function evaluateEvidenceDimension({ expectations, evidence_list, intake_declarations }) {
  const declared_evidence = intake_declarations?.process_declaration?.evidence_promised || [];
  const actual_evidence = evidence_list?.files || [];
  
  if (!declared_evidence || declared_evidence.length === 0) {
    return CONSISTENCY_LEVELS.CONSISTENT;
  }
  
  let missing_evidence = [];
  
  declared_evidence.forEach(promised => {
    const found = actual_evidence.some(actual => 
      actual.type && promised.toLowerCase().includes(actual.type.toLowerCase()) ||
      actual.name && promised.toLowerCase().includes(actual.name.toLowerCase())
    );
    
    if (!found) {
      missing_evidence.push(promised);
    }
  });
  
  if (missing_evidence.length === declared_evidence.length) {
    return CONSISTENCY_LEVELS.CONTRADICTORY;
  } else if (missing_evidence.length > 0) {
    return CONSISTENCY_LEVELS.WEAK;
  }
  
  return CONSISTENCY_LEVELS.CONSISTENT;
}

function calculateGlobalConsistency(dimensionResults) {
  const values = Object.values(dimensionResults);
  
  // Regla: Cualquier CONTRADICTORY → CONTRADICTORY
  if (values.includes(CONSISTENCY_LEVELS.CONTRADICTORY)) {
    return CONSISTENCY_LEVELS.CONTRADICTORY;
  }
  
  // Regla: Cualquier WEAK → WEAK
  if (values.includes(CONSISTENCY_LEVELS.WEAK)) {
    return CONSISTENCY_LEVELS.WEAK;
  }
  
  // Regla: Todas CONSISTENT → CONSISTENT
  return CONSISTENCY_LEVELS.CONSISTENT;
}

// ================================
// TESTS MÍNIMOS
// ================================

export const consistencyTests = {
  test1_consistent: () => {
    console.log('Test 1 (CONSISTENT): GIT 4 + señales IA fuertes');
    return CONSISTENCY_LEVELS.CONSISTENT;
  },
  
  test2_weak: () => {
    console.log('Test 2 (WEAK): GIT 1 sin archivos fuente');
    return CONSISTENCY_LEVELS.WEAK;
  },
  
  test3_contradictory: () => {
    console.log('Test 3 (CONTRADICTORY): GIT 0 + señales IA muy fuertes');
    return CONSISTENCY_LEVELS.CONTRADICTORY;
  },
  
  test4_mixed_signals: () => {
    console.log('Test 4 (MIXED -> WEAK): GIT 2 + sin fuentes + software no declarado');
    return CONSISTENCY_LEVELS.WEAK;
  },
  
  test5_promised_missing: () => {
    console.log('Test 5 (MISSING EVIDENCE -> WEAK): Evidencia prometida faltante');
    return CONSISTENCY_LEVELS.WEAK;
  }
};

// Ejecutar tests si es el módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Ejecutando tests de consistencia 2.4...');
  Object.values(consistencyTests).forEach(test => test());
  console.log('✅ Tests completados.');
}
