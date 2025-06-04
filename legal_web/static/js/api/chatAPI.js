// static/js/api/chatAPI.js

/**
 * Sends a message to the chatbot API and receives a response. (Mock implementation)
 * Real API call logic should be implemented here.
 * @param {string} messageContent - The user's message content.
 * @param {string} mode - The current chatbot mode (e.g., 'default', 'easy').
 * @param {function} getTranslation - Translation utility function.
 * @param {object} legalTerms - Legal terms dictionary.
 * @returns {Promise<object>} A Promise containing the bot's response data.
 */
export async function sendMessageToBot(messageContent, mode, getTranslation, legalTerms) {
    // --- Mock Response Logic (from original script.js) ---
    const prefix = mode === 'easy' ? getTranslation('easyModePrefix') : getTranslation('defaultModePrefix');
    let botResponseText = '';
    // Determine current language for mock logic (could be passed from translation.js)
    const currentLanguage = getTranslation('koreanTerm') === '한국어' ? 'ko' :
                           getTranslation('englishTerm') === 'English' ? 'en' :
                           getTranslation('japaneseTerm') === '日本語' ? 'ja' :
                           getTranslation('chineseTerm') === '中文' ? 'zh' :
                           getTranslation('spanishTerm') === 'Español' ? 'es' : 'ko'; // Default to 'ko'

    const articleRegex = new RegExp(getTranslation('articleKeywordRegex'), 'i');
    const articleMatch = messageContent.match(articleRegex);

    const termQueryRegex = new RegExp(
        `(.+?)(${getTranslation('termQuerySuffixRegex')})$`,
        'i'
    );
    const termMatch = messageContent.match(termQueryRegex);

    const greetingMatch = messageContent.match(
        new RegExp(`^${getTranslation('greetingKeyword')}$`, 'i')
    );

    if (greetingMatch) {
        botResponseText = getTranslation('sampleBotResponse', messageContent);
    } else if (articleMatch) {
        const clauseNum = articleMatch[1];
        const contractKeywords = ['계약서', 'contract', '契約書', '合同', 'contrato'];
        let contractName = '해당 문서';
        for (const keyword of contractKeywords) {
            if (messageContent.toLowerCase().includes(keyword.toLowerCase())) {
                const keywordIndex = messageContent.toLowerCase().indexOf(keyword.toLowerCase());
                if (keywordIndex > 0) {
                    const potentialName = messageContent.substring(0, keywordIndex).trim();
                    if (potentialName) {
                        contractName = potentialName;
                        break;
                    }
                }
            }
        }

        // Simple mock for clause content - replace with actual logic
        const mockClauses = {
            ko: {
                근로계약서: {
                    '1조': '이 계약은...',
                    '3조': '근로시간은 주 40시간으로 한다.',
                },
                임대차계약서: {
                    '5조': '임차인은 임대료를 매월 말일에 지급한다.',
                },
            },
            en: {
                'labor contract': {
                    'article 1': 'This contract is...',
                    'article 3': 'Working hours are 40 hours per week.',
                },
            },
            ja: {
                労働契約書: {
                    '第1条': 'この契約は...',
                    '第3条': '労働時間は週40時間とする。',
                },
            },
            zh: {
                劳动合同: {
                    '第1条': '本合同是...',
                    '第3条': '工作时间为每周40小时。',
                },
            },
            es: {
                'contrato laboral': {
                    'artículo 1': 'Este contrato es...',
                    'artículo 3': 'Las horas de trabajo son 40 horas por semana.',
                },
            },
        };

        const langClauses = mockClauses[currentLanguage] || mockClauses.ko;
        const contract = Object.keys(langClauses).find(
            (cn) =>
                contractName.toLowerCase().includes(cn.toLowerCase()) ||
                cn.toLowerCase().includes(contractName.toLowerCase())
        );
        const clauseKey =
            currentLanguage === 'en' ? `article ${clauseNum}` :
            currentLanguage === 'ja' ? `第${clauseNum}条` :
            currentLanguage === 'zh' ? `第${clauseNum}条` :
            currentLanguage === 'es' ? `artículo ${clauseNum}` :
            `${clauseNum}조`;

        if (contract && langClauses[contract] && langClauses[contract][clauseKey]) {
            const clauseContent = langClauses[contract][clauseKey];
            if (mode === 'easy') {
                botResponseText = `${prefix}${getTranslation(
                    'clauseResponseFormat',
                    `${contract} ${clauseKey}`,
                    clauseContent
                )} (쉬운 설명 추가 필요)`;
            } else {
                botResponseText = getTranslation(
                    'clauseResponseFormat',
                    `${contract} ${clauseKey}`,
                    clauseContent
                );
            }
        } else {
            botResponseText = getTranslation('clauseNotFound', contractName, clauseKey);
        }
    } else if (termMatch) {
        const termToExplain = termMatch[1].trim();
        const termKey = termToExplain.toLowerCase();
        const termSetForCurrentLang = legalTerms[currentLanguage] || {};
        const termSetKo = legalTerms.ko || {};
        let termData;

        if (termSetForCurrentLang[termKey]) {
            termData = termSetForCurrentLang[termKey];
        } else if (termSetKo[termKey]) {
            termData = termSetKo[termKey];
        } else {
            const koKey = Object.keys(termSetKo).find(
                (k) =>
                    (termSetKo[k].term && termSetKo[k].term.toLowerCase() === termKey) ||
                    (termSetKo[k].en_term && termSetKo[k].en_term.toLowerCase() === termKey) ||
                    (termSetKo[k].ja_term && termSetKo[k].ja_term.toLowerCase() === termKey) ||
                    (termSetKo[k].zh_term && termSetKo[k].zh_term.toLowerCase() === termKey) ||
                    (termSetKo[k].es_term && termSetKo[k].es_term.toLowerCase() === termKey)
            );
            if (koKey) termData = termSetKo[koKey];
        }

        if (termData) {
            let displayTerm = termData.term;
            let displayExplanation = termData.explanation;

            // Select term and explanation based on current language
            const currentLangCode = currentLanguage;
            if (currentLangCode === 'en' && termData.en_term) {
                displayTerm = termData.en_term;
                const enSpecificTermData = legalTerms.en[termData.en_term.toLowerCase()];
                if (enSpecificTermData) displayExplanation = enSpecificTermData.explanation;
            } else if (currentLangCode === 'ja' && termData.ja_term) {
                displayTerm = termData.ja_term;
                const jaSpecificTermData = legalTerms.ja[termData.ja_term.toLowerCase()];
                if (jaSpecificTermData) displayExplanation = jaSpecificTermData.explanation;
            } else if (currentLangCode === 'zh' && termData.zh_term) {
                displayTerm = termData.zh_term;
                const zhSpecificTermData = legalTerms.zh[termData.zh_term.toLowerCase()];
                if (zhSpecificTermData) displayExplanation = zhSpecificTermData.explanation;
            } else if (currentLangCode === 'es' && termData.es_term) {
                displayTerm = termData.es_term;
                const esSpecificTermData = legalTerms.es[termData.es_term.toLowerCase()];
                if (esSpecificTermData) displayExplanation = esSpecificTermData.explanation;
            } else if (currentLangCode === 'ko') {
                displayTerm = termData.term;
                displayExplanation = termData.explanation;
            }

            if (mode === 'easy') {
                botResponseText = `${prefix}${displayTerm}${getTranslation(
                    'termDefinitionConnective'
                )} ${getTranslation(
                    'sampleEasyExplanationForTerm',
                    displayTerm
                )} (원래 설명: ${explanation})`;
            } else {
                botResponseText = `${prefix}${displayTerm}${getTranslation(
                    'termDefinitionConnective'
                )} ${explanation}`;
            }
        } else {
            botResponseText = `${prefix}${getTranslation('sampleBotResponse', messageContent)}`;
        }
    } else if (messageContent.length > 100 && currentLanguage === 'ko') {
        botResponseText = getTranslation('longTextPlaceholder');
    } else if (messageContent.length > 200 && currentLanguage !== 'ko') {
        botResponseText = getTranslation('longTextPlaceholder');
    } else {
        if (mode === 'easy') {
            botResponseText = `${prefix}${getTranslation('sampleEasyModeResponse', messageContent)}`;
        } else {
            botResponseText = `${prefix}${getTranslation('sampleDefaultModeResponse', messageContent)}`;
        }
    }

    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ text: botResponseText });
        }, 500 + Math.random() * 500); // Simulate network delay
    });
}
