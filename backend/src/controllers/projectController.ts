import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validationResult } from 'express-validator';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthRequest, Project, ProjectStatus } from '../types';

// Helper function to calculate Levenshtein distance (edit distance)
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
};

// Comprehensive stop words list - common words that don't indicate similarity
const STOP_WORDS = new Set([
  // Articles
  'the', 'a', 'an',
  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into', 'onto', 'upon', 'over', 'under', 'above', 'below', 'between', 'among', 'through', 'during', 'before', 'after', 'since', 'until', 'within', 'without',
  // Conjunctions
  'and', 'or', 'but', 'nor', 'yet', 'so', 'because', 'if', 'when', 'while', 'although', 'though', 'unless',
  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  // Common verbs
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'done', 'get', 'got', 'getting', 'go', 'goes', 'went', 'going', 'gone', 'come', 'comes', 'came', 'coming',
  // Modal verbs
  'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would',
  // Common adjectives/adverbs
  'this', 'that', 'these', 'those', 'all', 'some', 'any', 'many', 'much', 'more', 'most', 'few', 'little', 'less', 'least', 'other', 'another', 'such', 'same', 'different', 'each', 'every', 'both', 'either', 'neither',
  // Common nouns/verbs
  'one', 'two', 'three', 'first', 'second', 'third', 'way', 'time', 'year', 'work', 'system', 'project', 'use', 'make', 'take', 'see', 'know', 'think', 'say', 'way', 'day', 'thing', 'part', 'case', 'man', 'woman', 'people', 'life', 'world', 'hand', 'place', 'number', 'group', 'problem', 'fact',
  // Academic/common phrases
  'study', 'research', 'analysis', 'development', 'implementation', 'design', 'method', 'approach', 'technique', 'process', 'model', 'framework', 'application', 'technology', 'system', 'management', 'information', 'data', 'result', 'study', 'paper', 'report', 'document'
]);

// Simple word stemming - convert words to root forms to catch variations
const stemWord = (word: string): string => {
  // Remove common suffixes to normalize word variations
  // This helps catch rephrased versions like "developing" vs "develops" vs "development"
  if (word.length <= 4) return word; // Don't stem short words
  
  // Remove plural forms (simple rules)
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y'; // "analytics" -> "analytic" (but keep as is for common cases)
  }
  if (word.endsWith('es') && word.length > 4) {
    // Only remove 'es' if preceded by 's', 'x', 'z', 'ch', 'sh'
    const beforeEs = word.slice(0, -2);
    if (beforeEs.endsWith('s') || beforeEs.endsWith('x') || beforeEs.endsWith('z') || 
        beforeEs.endsWith('ch') || beforeEs.endsWith('sh')) {
      return beforeEs;
    }
  }
  if (word.endsWith('s') && word.length > 4) {
    return word.slice(0, -1);
  }
  
  // Remove verb endings
  if (word.endsWith('ing') && word.length > 5) {
    const stem = word.slice(0, -3);
    // If double consonant at end, keep one (e.g., "running" -> "run")
    if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  if (word.endsWith('ed') && word.length > 5) {
    const stem = word.slice(0, -2);
    if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  if (word.endsWith('er') && word.length > 5) {
    return word.slice(0, -2); // "developer" -> "develop"
  }
  if (word.endsWith('tion') && word.length > 6) {
    return word.slice(0, -4) + 't'; // "implementation" -> "implement"
  }
  if (word.endsWith('sion') && word.length > 6) {
    return word.slice(0, -4) + 's'; // "decision" -> "decide" (simplified)
  }
  if (word.endsWith('ment') && word.length > 6) {
    return word.slice(0, -4); // "management" -> "manage"
  }
  if (word.endsWith('ly') && word.length > 5) {
    return word.slice(0, -2); // "quickly" -> "quick"
  }
  
  return word;
};

// Synonym/concept mapping - group related words to catch rephrasing
const CONCEPT_GROUPS: Map<string, string> = new Map([
  // Development/Implementation concepts
  ['create', 'develop'], ['creating', 'developing'], ['building', 'developing'],
  ['construct', 'develop'], ['design', 'develop'], ['implement', 'develop'],
  ['application', 'system'], ['app', 'system'], ['software', 'system'],
  ['platform', 'system'], ['solution', 'system'],
  // Analysis/Research concepts
  ['study', 'research'], ['investigate', 'research'], ['examine', 'research'],
  ['analyze', 'research'], ['evaluate', 'research'], ['explore', 'research'],
  // Technology concepts
  ['technique', 'method'], ['approach', 'method'], ['strategy', 'method'],
  ['algorithm', 'method'], ['procedure', 'method'],
  // User/People concepts
  ['user', 'student'], ['person', 'student'], ['individual', 'student'],
  // Management concepts
  ['handle', 'manage'], ['control', 'manage'], ['organize', 'manage'],
  // Improve/Enhance concepts
  ['improve', 'enhance'], ['optimize', 'enhance'], ['upgrade', 'enhance'],
  ['boost', 'enhance'], ['increase', 'enhance']
]);

// Normalize word to canonical form using stemming and concept groups
const normalizeWord = (word: string): string => {
  const stemmed = stemWord(word);
  // Check if word or stemmed version has a canonical concept form
  return CONCEPT_GROUPS.get(stemmed) || CONCEPT_GROUPS.get(word) || stemmed;
};

// Extract meaningful words with normalization (filter stop words, short words, and numbers)
const extractMeaningfulWords = (text: string): string[] => {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => {
      // Only keep words that:
      // 1. Are at least 3 characters long (reduces false positives from "is", "it", etc.)
      // 2. Are not stop words
      // 3. Are not purely numeric (but allow alphanumeric like "api2")
      // 4. Contain at least one letter (not pure numbers or symbols)
      return word.length >= 3 && 
             !STOP_WORDS.has(word) && 
             !/^\d+$/.test(word) && 
             /[a-z]/.test(word);
    })
    .map(word => normalizeWord(word)) // Normalize to root form and concepts
    .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
  
  return words;
};

// Extract n-grams (sequences of words) for better context matching
const extractNGrams = (words: string[], n: number = 2): Set<string> => {
  const ngrams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    const ngram = words.slice(i, i + n).join(' ');
    ngrams.add(ngram);
  }
  return ngrams;
};

// Helper function to calculate similarity percentage using improved methods
const calculateSimilarity = (text1: string, text2: string): number => {
  // Normalize texts: lowercase and remove extra whitespace
  const normalized1 = text1.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalized2 = text2.toLowerCase().trim().replace(/\s+/g, ' ');

  if (!normalized1 || !normalized2) {
    return 0;
  }

  // Extract meaningful words (filtered stop words and short words)
  const words1 = extractMeaningfulWords(normalized1);
  const words2 = extractMeaningfulWords(normalized2);

  // If either text has no meaningful words after filtering, similarity is low
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }

  // Method 1: Weighted Jaccard Similarity (most important for content similarity)
  // Weight words by length - longer words are more meaningful
  const getWordWeights = (words: string[]): Map<string, number> => {
    const weights = new Map<string, number>();
    const wordFreq = new Map<string, number>();
    
    // Count frequencies
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Calculate weights: longer words and less frequent words get higher weights
    words.forEach(word => {
      const freq = wordFreq.get(word) || 1;
      const lengthWeight = Math.log(word.length + 1); // Logarithmic length weight
      const rarityWeight = 1 / freq; // Less frequent words are more meaningful
      weights.set(word, lengthWeight * rarityWeight);
    });
    
    return weights;
  };

  const weights1 = getWordWeights(words1);
  const weights2 = getWordWeights(words2);

  // Calculate weighted intersection and union
  let intersectionWeight = 0;
  let unionWeight = 0;
  
  const allWords = new Set([...words1, ...words2]);
  allWords.forEach(word => {
    const weight1 = weights1.get(word) || 0;
    const weight2 = weights2.get(word) || 0;
    
    if (weight1 > 0 && weight2 > 0) {
      // Word appears in both - use minimum weight for intersection
      intersectionWeight += Math.min(weight1, weight2);
    }
    // Use maximum weight for union (word appears in at least one)
    unionWeight += Math.max(weight1, weight2);
  });

  const weightedJaccardSimilarity = unionWeight > 0 
    ? (intersectionWeight / unionWeight) * 100 
    : 0;

  // Method 2: Multi-level N-gram Similarity (for phrase/context matching)
  // Use bigrams, trigrams, and 4-grams to catch rephrased phrases
  const bigrams1 = extractNGrams(words1, 2);
  const bigrams2 = extractNGrams(words2, 2);
  const trigrams1 = extractNGrams(words1, 3);
  const trigrams2 = extractNGrams(words2, 3);
  const fourgrams1 = extractNGrams(words1, 4);
  const fourgrams2 = extractNGrams(words2, 4);
  
  // Calculate similarity for each n-gram level
  const commonBigrams = [...bigrams1].filter(bg => bigrams2.has(bg)).length;
  const totalBigrams = new Set([...bigrams1, ...bigrams2]).size;
  const bigramSimilarity = totalBigrams > 0 
    ? (commonBigrams / totalBigrams) * 100 
    : 0;
  
  const commonTrigrams = [...trigrams1].filter(tg => trigrams2.has(tg)).length;
  const totalTrigrams = new Set([...trigrams1, ...trigrams2]).size;
  const trigramSimilarity = totalTrigrams > 0 
    ? (commonTrigrams / totalTrigrams) * 100 
    : 0;
  
  const commonFourgrams = [...fourgrams1].filter(fg => fourgrams2.has(fg)).length;
  const totalFourgrams = new Set([...fourgrams1, ...fourgrams2]).size;
  const fourgramSimilarity = totalFourgrams > 0 
    ? (commonFourgrams / totalFourgrams) * 100 
    : 0;
  
  // Weighted n-gram similarity (longer n-grams are more indicative of similarity)
  const ngramSimilarity = (
    bigramSimilarity * 0.3 +      // 30% weight for bigrams
    trigramSimilarity * 0.4 +     // 40% weight for trigrams
    fourgramSimilarity * 0.3      // 30% weight for 4-grams
  );

  // Method 3: Character-level N-gram Similarity (catches reordered/rephrased content)
  // This helps detect similarity even when words are rearranged
  const getCharacterNGrams = (text: string, n: number = 3): Set<string> => {
    const ngrams = new Set<string>();
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.add(text.substring(i, i + n));
    }
    return ngrams;
  };
  
  const charTrigrams1 = getCharacterNGrams(normalized1.replace(/\s+/g, ''), 3);
  const charTrigrams2 = getCharacterNGrams(normalized2.replace(/\s+/g, ''), 3);
  const commonCharTrigrams = [...charTrigrams1].filter(cg => charTrigrams2.has(cg)).length;
  const totalCharTrigrams = new Set([...charTrigrams1, ...charTrigrams2]).size;
  const charNGramSimilarity = totalCharTrigrams > 0 
    ? (commonCharTrigrams / totalCharTrigrams) * 100 
    : 0;

  // Method 4: Levenshtein Distance (for very similar texts, but minimal weight)
  // Only use if texts are reasonably similar (to avoid false positives from random character matches)
  const maxLen = Math.max(normalized1.length, normalized2.length);
  const distance = levenshteinDistance(normalized1, normalized2);
  const levenshteinSimilarity = maxLen > 0 
    ? ((maxLen - distance) / maxLen) * 100 
    : 0;

  // Only consider Levenshtein if it's already showing significant similarity (threshold at 40%)
  // This prevents false positives from short texts with similar characters
  const effectiveLevenshtein = levenshteinSimilarity >= 40 ? levenshteinSimilarity : 0;

  // Method 5: Key Concept Overlap (focus on important technical terms)
  // Extract longer words (likely technical terms) and compare
  const getKeyConcepts = (words: string[]): string[] => {
    return words.filter(word => word.length >= 6); // Technical terms are usually longer
  };
  
  const concepts1 = getKeyConcepts(words1);
  const concepts2 = getKeyConcepts(words2);
  
  let conceptSimilarity = 0;
  if (concepts1.length > 0 && concepts2.length > 0) {
    const commonConcepts = concepts1.filter(c => concepts2.includes(c)).length;
    const unionConcepts = new Set([...concepts1, ...concepts2]).size;
    conceptSimilarity = unionConcepts > 0 
      ? (commonConcepts / unionConcepts) * 100 
      : 0;
  }

  // Combine similarities with improved weights
  // Weighted Jaccard (40%) - focuses on normalized meaningful words
  // N-gram similarity (35%) - catches rephrased phrases and context
  // Key concepts (15%) - technical term overlap indicates strong similarity
  // Character n-grams (7%) - catches reordered content
  // Levenshtein (3%) - only for very similar texts
  const finalSimilarity = (
    weightedJaccardSimilarity * 0.40 +    // 40% weight - normalized word matching
    ngramSimilarity * 0.35 +              // 35% weight - phrase/context matching (multi-level)
    conceptSimilarity * 0.15 +            // 15% weight - key technical terms
    charNGramSimilarity * 0.07 +          // 7% weight - character-level matching
    effectiveLevenshtein * 0.03            // 3% weight - only for very similar texts
  );

  // Cap similarity at 100%
  return Math.min(Math.round(finalSimilarity * 100) / 100, 100);
};

// Get all projects (with filters)
export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status, academic_year, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build WHERE conditions
    let whereConditions = '1=1';
    const params: any[] = [];

    // Role-based filtering
    if (user.role === 'student') {
      whereConditions += ' AND p.student_id = ?';
      params.push(user.id);
    } else if (user.role === 'lecturer') {
      whereConditions += ' AND (p.supervisor_id = ? OR p.supervisor_preference_1 = ? OR p.supervisor_preference_2 = ? OR p.supervisor_preference_3 = ?)';
      params.push(user.id, user.id, user.id, user.id);
    }
    // Coordinators see all projects - no additional filter needed

    // Additional filters
    if (status) {
      whereConditions += ' AND p.status = ?';
      params.push(status);
    }

    if (academic_year) {
      whereConditions += ' AND p.academic_year = ?';
      params.push(academic_year);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      WHERE ${whereConditions}
    `;
    const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, params);
    const total = countResult[0].total;

    // Get projects with pagination
    const limitNum = parseInt(String(limit), 10);
    const offsetNum = parseInt(String(offset), 10);
    
    const query = `
      SELECT p.*, 
             s.first_name as student_first_name, 
             s.last_name as student_last_name,
             s.student_id as student_matric,
             s.email as student_email,
             l.first_name as supervisor_first_name,
             l.last_name as supervisor_last_name
      FROM projects p
      LEFT JOIN users s ON p.student_id = s.id
      LEFT JOIN users l ON p.supervisor_id = l.id
      WHERE ${whereConditions}
      ORDER BY p.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;
    
    const [projects] = await pool.execute<RowDataPacket[]>(query, params);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching projects'
    });
  }
};

// Get single project
export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const [projects] = await pool.execute<RowDataPacket[]>(`
      SELECT p.*, 
             s.first_name as student_first_name, 
             s.last_name as student_last_name,
             s.student_id as student_matric,
             s.email as student_email,
             s.department as student_department,
             l.first_name as supervisor_first_name,
             l.last_name as supervisor_last_name,
             l.email as supervisor_email
      FROM projects p
      LEFT JOIN users s ON p.student_id = s.id
      LEFT JOIN users l ON p.supervisor_id = l.id
      WHERE p.id = ?
    `, [id]);

    if (projects.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const project = projects[0] as Project & Record<string, any>;

    // Authorization check
    if (user.role === 'student' && project.student_id !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Get submissions for this project
    const [submissions] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM submissions WHERE project_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...project,
        submissions
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the project'
    });
  }
};

// Create project (Topic Submission)
export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Project creation validation errors:', errors.array());
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          msg: err.msg,
          param: err.type === 'field' ? err.path : undefined
        }))
      });
      return;
    }

    const user = req.user!;

    if (user.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only students can submit project proposals'
      });
      return;
    }

    // Check if submission window is open
    // First get the active year config
    const [activeYearConfig] = await pool.execute<RowDataPacket[]>(`
      SELECT * FROM academic_year_config 
      WHERE is_active = true
    `);

    if (activeYearConfig.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No active academic year configuration found'
      });
      return;
    }

    const config = activeYearConfig[0];
    
    // Check if start and end dates are the same (within 1 second tolerance) - block submissions
    const topicStart = new Date(config.topic_submission_start);
    const topicEnd = new Date(config.topic_submission_end);
    
    // Use 1 second tolerance to account for potential time differences
    if (Math.abs(topicStart.getTime() - topicEnd.getTime()) < 1000) {
      res.status(400).json({
        success: false,
        message: `Topic submission window is closed. The coordinator has set the same start and end date (${topicStart.toLocaleString()}), indicating submissions are currently not accepted. Please contact the coordinator if you need to submit.`
      });
      return;
    }
    
    // Check if current time is within the window (exclusive of end time)
    const now = new Date();
    if (now < topicStart || now >= topicEnd) {
      res.status(400).json({
        success: false,
        message: 'Topic submission is not currently open'
      });
      return;
    }

    const activeYear = activeYearConfig;

    // Config is already set above, remove this line as it's redundant

    // Check if student already has a project this year
    const [existingProjects] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM projects WHERE student_id = ? AND academic_year = ?',
      [user.id, config.year]
    );

    // Determine if this is a resubmission
    const isResubmission = existingProjects.length > 0 && existingProjects[0].status === 'rejected';
    const excludeProjectId = isResubmission ? existingProjects[0].id : null;

    if (existingProjects.length > 0) {
      const existingProject = existingProjects[0];
      
      // Allow resubmission only if project is rejected and within deadline
      if (existingProject.status === 'rejected') {
        // This is a resubmission - we'll update the existing project instead of creating a new one
        // The update will happen below after validation
      } else if (['approved', 'approved_with_modifications', 'in_progress', 'completed'].includes(existingProject.status)) {
        res.status(400).json({
          success: false,
          message: 'Your project has already been approved. Further submissions are not allowed.'
        });
        return;
      } else {
        res.status(400).json({
          success: false,
          message: 'You have already submitted a project proposal for this academic year'
        });
        return;
      }
    }

    const {
      title,
      description,
      problem_statement,
      objectives,
      methodology,
      supervisor_preference_1,
      supervisor_preference_2,
      supervisor_preference_3,
      originality_declared
    } = req.body;

    // Convert empty strings to null for supervisor preferences
    const pref1 = supervisor_preference_1 && supervisor_preference_1.trim() !== '' ? supervisor_preference_1 : null;
    const pref2 = supervisor_preference_2 && supervisor_preference_2.trim() !== '' ? supervisor_preference_2 : null;
    const pref3 = supervisor_preference_3 && supervisor_preference_3.trim() !== '' ? supervisor_preference_3 : null;
    
    // Ensure originality_declared is a boolean
    const isOriginal = originality_declared === true || originality_declared === 'true' || originality_declared === 1 || originality_declared === '1';

    // Check for similar project descriptions (using similarity algorithm)
    // Compare against all submitted/approved projects (excluding rejected ones and current student's rejected project if resubmitting)
    let similarityQuery = `
      SELECT id, title, description, student_id FROM projects 
      WHERE academic_year IN (?, ?, ?)
      AND status IN ('submitted', 'under_review', 'approved', 'approved_with_modifications')
    `;
    const similarityParams: any[] = [config.year, getPreviousYear(config.year), getPreviousYear(getPreviousYear(config.year))];
    
    if (excludeProjectId) {
      similarityQuery += ' AND id != ?';
      similarityParams.push(excludeProjectId);
    }
    
    const [allProjectsForSimilarity] = await pool.execute<RowDataPacket[]>(similarityQuery, similarityParams);

    console.log(`[SIMILARITY CHECK] Checking ${allProjectsForSimilarity.length} existing projects for similarity`);
    console.log(`[SIMILARITY CHECK] New project description length: ${description.length} characters`);

    // Compare the new project description with existing ones
    // Use description as the primary field for comparison
    const newProjectText = description.toLowerCase();
    const similarProjects = [];

    for (const existingProject of allProjectsForSimilarity) {
      // Skip if it's the same student (they can resubmit their own rejected project)
      if (existingProject.student_id === user.id) {
        console.log(`[SIMILARITY CHECK] Skipping own project: ${existingProject.title}`);
        continue;
      }
      
      if (!existingProject.description || existingProject.description.trim().length === 0) {
        console.log(`[SIMILARITY CHECK] Skipping project with empty description: ${existingProject.title}`);
        continue;
      }
      
      const existingText = existingProject.description.toLowerCase();
      const similarity = calculateSimilarity(newProjectText, existingText);

      console.log(`[SIMILARITY CHECK] Comparing with "${existingProject.title}": ${similarity.toFixed(2)}% similarity`);

      // If similarity is 25% or higher, flag it as similar (lowered threshold for stricter checking)
      if (similarity >= 25) {
        console.log(`[SIMILARITY CHECK] ⚠️ HIGH SIMILARITY DETECTED: ${similarity.toFixed(2)}% with "${existingProject.title}"`);
        similarProjects.push({
          id: existingProject.id,
          title: existingProject.title,
          similarity: similarity
        });
      }
    }

    // Sort by similarity (highest first) and take the most similar
    similarProjects.sort((a, b) => b.similarity - a.similarity);

    if (similarProjects.length > 0) {
      const mostSimilar = similarProjects[0];
      const topSimilar = similarProjects.slice(0, 3);
      
      console.log(`[SIMILARITY CHECK] Blocking submission for student ${user.id}. Similarity: ${mostSimilar.similarity.toFixed(1)}% with project: "${mostSimilar.title}"`);
      
      // Create notification for the student explaining why submission was blocked
      const notificationMessage = `Your project proposal submission was blocked due to significant similarity (${mostSimilar.similarity.toFixed(1)}%) with an existing proposal: "${mostSimilar.title}". Please modify your project description to make it more unique before resubmitting.`;
      
      try {
        await pool.execute<ResultSetHeader>(`
          INSERT INTO notifications (id, user_id, title, message, type, link)
          VALUES (?, ?, 'Submission Blocked - Similarity Detected', ?, 'error', ?)
        `, [
          uuidv4(),
          user.id,
          notificationMessage,
          '/student/submit-project'
        ]);
        console.log(`[SIMILARITY CHECK] Notification created for student ${user.id}`);
      } catch (notifError) {
        console.error('[SIMILARITY CHECK] Error creating notification:', notifError);
        // Continue even if notification fails
      }

      res.status(400).json({
        success: false,
        message: `Your project description is ${mostSimilar.similarity.toFixed(1)}% similar to an existing proposal: "${mostSimilar.title}". Please modify your project description to make it more unique.`,
        data: { 
          similarProject: mostSimilar.title,
          similarity: mostSimilar.similarity,
          allSimilar: topSimilar.map(p => ({ title: p.title, similarity: p.similarity }))
        }
      });
      return;
    }
    
    console.log(`[SIMILARITY CHECK] No significant similarities found. Submission allowed for student ${user.id}`);

    // Check if this is a resubmission of a rejected project (already determined above)
    let projectId: string;

    if (isResubmission) {
      // Update existing rejected project
      projectId = existingProjects[0].id;
      await pool.execute<ResultSetHeader>(`
        UPDATE projects SET
          title = ?,
          description = ?,
          problem_statement = ?,
          objectives = ?,
          methodology = ?,
          status = 'submitted',
          supervisor_preference_1 = ?,
          supervisor_preference_2 = ?,
          supervisor_preference_3 = ?,
          originality_declared = ?,
          rejection_reason = NULL,
          supervisor_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        title, description, problem_statement, objectives,
        methodology, pref1, pref2, pref3, isOriginal, projectId
      ]);
    } else {
      // Create new project
      projectId = uuidv4();
      await pool.execute<ResultSetHeader>(`
        INSERT INTO projects (
          id, student_id, title, description, problem_statement, objectives, 
          methodology, status, academic_year, supervisor_preference_1, 
          supervisor_preference_2, supervisor_preference_3, originality_declared
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?)
      `, [
        projectId, user.id, title, description, problem_statement, objectives,
        methodology, config.year, pref1, pref2, pref3, isOriginal
      ]);
    }

    // Create initial submission records only if this is a new project (not a resubmission)
    // For resubmissions, submissions should already exist
    if (!isResubmission) {
      // Use end dates if available, otherwise fall back to single deadline values
      const submissionTypes = [
        { type: 'alpha', max_marks: 6, deadline: config.alpha_deadline_end || config.alpha_deadline },
        { type: 'beta', max_marks: 4, deadline: config.beta_deadline_end || config.beta_deadline },
        { type: 'presentation', max_marks: 20, deadline: config.presentation_end },
        { type: 'final', max_marks: 60, deadline: config.final_deadline_end || config.final_deadline },
        { type: 'project_management', max_marks: 10, deadline: config.final_deadline_end || config.final_deadline }
      ];

      for (const sub of submissionTypes) {
        await pool.execute<ResultSetHeader>(`
          INSERT INTO submissions (id, project_id, submission_type, status, deadline, max_marks)
          VALUES (?, ?, ?, 'pending', ?, ?)
        `, [uuidv4(), projectId, sub.type, sub.deadline, sub.max_marks]);
      }
    }

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'CREATE', 'PROJECT', ?, ?, ?)
    `, [uuidv4(), user.id, projectId, JSON.stringify({ title }), req.ip]);

    // Create notifications for preferred supervisors
    const supervisorIds = [supervisor_preference_1, supervisor_preference_2, supervisor_preference_3].filter(Boolean);
    for (const supervisorId of supervisorIds) {
      await pool.execute<ResultSetHeader>(`
        INSERT INTO notifications (id, user_id, title, message, type, link)
        VALUES (?, ?, 'New Project Proposal', ?, 'info', ?)
      `, [uuidv4(), supervisorId, `${user.first_name} ${user.last_name} has submitted a project proposal and selected you as a preferred supervisor.`, `/projects/${projectId}`]);
    }

    res.status(201).json({
      success: true,
      message: isResubmission 
        ? 'Project proposal resubmitted successfully' 
        : 'Project proposal submitted successfully',
      data: { id: projectId, title, status: 'submitted' }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while submitting the project'
    });
  }
};

// Update project (for modifications)
export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const [projects] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const project = projects[0] as Project;

    // Only student can update their own project
    if (user.role === 'student') {
      if (project.student_id !== user.id) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      if (!['draft', 'approved_with_modifications'].includes(project.status)) {
        res.status(400).json({
          success: false,
          message: 'Project cannot be modified in its current state'
        });
        return;
      }
    }

    const {
      title,
      description,
      problem_statement,
      objectives,
      methodology
    } = req.body;

    await pool.execute<ResultSetHeader>(`
      UPDATE projects SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        problem_statement = COALESCE(?, problem_statement),
        objectives = COALESCE(?, objectives),
        methodology = COALESCE(?, methodology),
        status = CASE WHEN status = 'approved_with_modifications' THEN 'submitted' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, problem_statement, objectives, methodology, id]);

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
      VALUES (?, ?, 'UPDATE', 'PROJECT', ?, ?, ?, ?)
    `, [uuidv4(), user.id, id, JSON.stringify({ title: project.title }), JSON.stringify({ title }), req.ip]);

    res.json({
      success: true,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the project'
    });
  }
};

// Review project (Lecturer)
export const reviewProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { action, reason, modification_notes } = req.body;

    if (user.role !== 'lecturer' && user.role !== 'coordinator') {
      res.status(403).json({
        success: false,
        message: 'Only lecturers can review projects'
      });
      return;
    }

    const [projects] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Project not found'
      });
      return;
    }

    const project = projects[0] as Project;

    if (project.status !== 'submitted' && project.status !== 'under_review') {
      res.status(400).json({
        success: false,
        message: 'Project is not pending review'
      });
      return;
    }

    let newStatus: ProjectStatus;
    let message: string;

    switch (action) {
      case 'approve':
        // Check lecturer capacity - get from lecturer_capacity or use default from academic_year_config
        const [capacity] = await pool.execute<RowDataPacket[]>(`
          SELECT lc.*
          FROM lecturer_capacity lc
          WHERE lc.lecturer_id = ? AND lc.academic_year = ?
        `, [user.id, project.academic_year]);

        let maxStudents = 10;
        let currentStudents = 0;
        let capacityId = null;

        if (capacity.length > 0) {
          maxStudents = capacity[0].max_students || 10;
          currentStudents = capacity[0].current_students || 0;
          capacityId = capacity[0].id;
        } else {
          // No capacity record exists, get default from academic_year_config
          const [academicYearConfig] = await pool.execute<RowDataPacket[]>(
            'SELECT max_supervisor_load FROM academic_year_config WHERE year = ? AND is_active = true',
            [project.academic_year]
          );
          maxStudents = academicYearConfig.length > 0 ? academicYearConfig[0].max_supervisor_load : 10;
        }

        if (currentStudents >= maxStudents) {
          res.status(400).json({
            success: false,
            message: `You have reached your maximum supervision capacity of ${maxStudents} students`
          });
          return;
        }

        newStatus = 'approved';
        message = 'Project approved successfully';

        // Assign supervisor and update capacity
        await pool.execute<ResultSetHeader>(
          'UPDATE projects SET supervisor_id = ?, status = ? WHERE id = ?',
          [user.id, newStatus, id]
        );

        if (capacityId) {
          await pool.execute<ResultSetHeader>(
            'UPDATE lecturer_capacity SET current_students = current_students + 1 WHERE id = ?',
            [capacityId]
          );
        } else {
          // Create capacity record if it doesn't exist, using configured max_supervisor_load
          await pool.execute<ResultSetHeader>(`
            INSERT INTO lecturer_capacity (id, lecturer_id, academic_year, max_students, current_students)
            VALUES (?, ?, ?, ?, 1)
          `, [uuidv4(), user.id, project.academic_year, maxStudents]);
        }
        break;

      case 'approve_with_modifications':
        // Check lecturer capacity - get from lecturer_capacity or use default from academic_year_config
        const [capacityMod] = await pool.execute<RowDataPacket[]>(`
          SELECT lc.*
          FROM lecturer_capacity lc
          WHERE lc.lecturer_id = ? AND lc.academic_year = ?
        `, [user.id, project.academic_year]);

        let maxStudentsMod = 10;
        let currentStudentsMod = 0;
        let capacityIdMod = null;

        if (capacityMod.length > 0) {
          maxStudentsMod = capacityMod[0].max_students || 10;
          currentStudentsMod = capacityMod[0].current_students || 0;
          capacityIdMod = capacityMod[0].id;
        } else {
          // No capacity record exists, get default from academic_year_config
          const [academicYearConfigMod] = await pool.execute<RowDataPacket[]>(
            'SELECT max_supervisor_load FROM academic_year_config WHERE year = ? AND is_active = true',
            [project.academic_year]
          );
          maxStudentsMod = academicYearConfigMod.length > 0 ? academicYearConfigMod[0].max_supervisor_load : 10;
        }

        if (currentStudentsMod >= maxStudentsMod) {
          res.status(400).json({
            success: false,
            message: `You have reached your maximum supervision capacity of ${maxStudentsMod} students`
          });
          return;
        }

        newStatus = 'approved_with_modifications';
        message = 'Project approved with modifications';

        // Assign supervisor and update status with modification notes
        await pool.execute<ResultSetHeader>(
          'UPDATE projects SET supervisor_id = ?, status = ?, modification_notes = ? WHERE id = ?',
          [user.id, newStatus, modification_notes, id]
        );

        // Update capacity
        if (capacityIdMod) {
          await pool.execute<ResultSetHeader>(
            'UPDATE lecturer_capacity SET current_students = current_students + 1 WHERE id = ?',
            [capacityIdMod]
          );
        } else {
          // Create capacity record if it doesn't exist, using configured max_supervisor_load
          await pool.execute<ResultSetHeader>(`
            INSERT INTO lecturer_capacity (id, lecturer_id, academic_year, max_students, current_students)
            VALUES (?, ?, ?, ?, 1)
          `, [uuidv4(), user.id, project.academic_year, maxStudentsMod]);
        }
        break;

      case 'reject':
        if (!reason) {
          res.status(400).json({
            success: false,
            message: 'Rejection reason is required'
          });
          return;
        }
        newStatus = 'rejected';
        message = 'Project rejected';
        // Clear supervisor assignment when rejecting (student can resubmit)
        // Also decrease capacity if project was previously approved
        if (['approved', 'approved_with_modifications', 'in_progress'].includes(project.status)) {
          // Decrease lecturer capacity
          const [capacityForReject] = await pool.execute<RowDataPacket[]>(`
            SELECT * FROM lecturer_capacity 
            WHERE lecturer_id = ? AND academic_year = ?
          `, [user.id, project.academic_year]);
          
          if (capacityForReject.length > 0 && capacityForReject[0].current_students > 0) {
            await pool.execute<ResultSetHeader>(
              'UPDATE lecturer_capacity SET current_students = current_students - 1 WHERE id = ?',
              [capacityForReject[0].id]
            );
          }
        }
        
        await pool.execute<ResultSetHeader>(
          'UPDATE projects SET status = ?, rejection_reason = ?, supervisor_id = NULL WHERE id = ?',
          [newStatus, reason, id]
        );
        break;

      default:
        res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
        return;
    }

    // Notify student
    const [student] = await pool.execute<RowDataPacket[]>(
      'SELECT id, first_name FROM users WHERE id = ?',
      [project.student_id]
    );

    if (student.length > 0) {
      const notificationMessage = action === 'approve'
        ? `Your project "${project.title}" has been approved by ${user.first_name} ${user.last_name}.`
        : action === 'approve_with_modifications'
        ? `Your project "${project.title}" requires modifications. Please review the feedback.`
        : `Your project "${project.title}" has been rejected. Reason: ${reason}`;

      await pool.execute<ResultSetHeader>(`
        INSERT INTO notifications (id, user_id, title, message, type, link)
        VALUES (?, ?, 'Project Review Update', ?, ?, ?)
      `, [
        uuidv4(), 
        project.student_id, 
        notificationMessage,
        action === 'approve' ? 'success' : action === 'reject' ? 'error' : 'warning',
        `/projects/${id}`
      ]);
    }

    // Log the action
    await pool.execute<ResultSetHeader>(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address)
      VALUES (?, ?, 'REVIEW', 'PROJECT', ?, ?, ?)
    `, [uuidv4(), user.id, id, JSON.stringify({ action, reason, modification_notes }), req.ip]);

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Review project error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while reviewing the project'
    });
  }
};

// Get available lecturers for supervision
export const getAvailableLecturers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [activeYear] = await pool.execute<RowDataPacket[]>(
      'SELECT year FROM academic_year_config WHERE is_active = true LIMIT 1'
    );

    if (activeYear.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No active academic year configured'
      });
      return;
    }

    // Get max_supervisor_load from academic year config for default value
    const [academicYearConfig] = await pool.execute<RowDataPacket[]>(
      'SELECT max_supervisor_load FROM academic_year_config WHERE year = ? AND is_active = true',
      [activeYear[0].year]
    );
    const defaultMaxStudents = academicYearConfig.length > 0 ? academicYearConfig[0].max_supervisor_load : 10;

    // Get lecturers with actual project counts (more accurate than current_students field)
    const [lecturers] = await pool.execute<RowDataPacket[]>(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.department,
             COALESCE(lc.max_students, ?) as max_students,
             COALESCE(lc.is_available, true) as is_available,
             COUNT(DISTINCT p.id) as actual_current_students
      FROM users u
      LEFT JOIN lecturer_capacity lc ON u.id = lc.lecturer_id AND lc.academic_year = ?
      LEFT JOIN projects p ON u.id = p.supervisor_id 
        AND p.academic_year = ?
        AND p.status IN ('approved', 'approved_with_modifications', 'in_progress', 'completed')
      WHERE u.role = 'lecturer' AND u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.department, lc.max_students, lc.is_available
      HAVING is_available = true AND actual_current_students < COALESCE(lc.max_students, ?)
      ORDER BY u.last_name, u.first_name
    `, [defaultMaxStudents, activeYear[0].year, activeYear[0].year, defaultMaxStudents]);

    res.json({
      success: true,
      data: lecturers
    });
  } catch (error) {
    console.error('Get available lecturers error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching lecturers'
    });
  }
};

// Check for duplicate/similar descriptions
export const checkDuplicate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description } = req.body;

    if (!description || description.length < 200) {
      res.status(400).json({
        success: false,
        message: 'Description must be at least 200 characters'
      });
      return;
    }

    const [activeYear] = await pool.execute<RowDataPacket[]>(
      'SELECT year FROM academic_year_config WHERE is_active = true LIMIT 1'
    );

    const currentYear = activeYear.length > 0 ? activeYear[0].year : new Date().getFullYear().toString();

    // Get all existing projects in the academic year
    const [existingProjects] = await pool.execute<RowDataPacket[]>(`
      SELECT id, title, description, academic_year, status
      FROM projects
      WHERE academic_year IN (?, ?, ?)
      AND status IN ('submitted', 'under_review', 'approved', 'approved_with_modifications')
    `, [
      currentYear,
      getPreviousYear(currentYear),
      getPreviousYear(getPreviousYear(currentYear))
    ]);

    // Check similarity using description
    // Use improved threshold (30%) to reduce false positives and focus on genuine similarities
    const similarProjects = [];
    const newProjectText = description.toLowerCase();

    for (const existingProject of existingProjects) {
      if (!existingProject.description || existingProject.description.trim().length === 0) {
        continue;
      }
      
      const existingText = existingProject.description.toLowerCase();
      const similarity = calculateSimilarity(newProjectText, existingText);

      // Show projects with 30% or more similarity for review
      // Increased threshold to reduce false positives - only show genuine similarities
      if (similarity >= 30) {
        similarProjects.push({
          id: existingProject.id,
          title: existingProject.title,
          description: existingProject.description,
          academic_year: existingProject.academic_year,
          status: existingProject.status,
          similarity: similarity
        });
      }
    }

    // Sort by similarity (highest first)
    similarProjects.sort((a, b) => b.similarity - a.similarity);

    res.json({
      success: true,
      data: {
        isDuplicate: similarProjects.length > 0,
        similarProjects: similarProjects.slice(0, 10) // Return top 10 most similar for review page
      }
    });
  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while checking for duplicates'
    });
  }
};

// Helper function to get previous academic year
function getPreviousYear(year: string): string {
  const parts = year.split('/');
  if (parts.length === 2) {
    return `${parseInt(parts[0]) - 1}/${parseInt(parts[1]) - 1}`;
  }
  return `${parseInt(year) - 1}`;
}

