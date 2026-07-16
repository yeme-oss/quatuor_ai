// UI strings and runtime prompt templates for both supported languages.
// Values may be plain strings (safe static HTML allowed) or functions taking arguments.

export const UI = {
  en: {
    scenarioLabel: 'Scenario',
    speedLabel: 'Speed',
    modelLabel: 'Model',
    speedFast: 'Fast (1.5s)',
    speedNormal: 'Normal (3s)',
    speedSlow: 'Slow (5s)',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    configBtnTitle: 'Configure characters',
    langBtnLabel: 'FR',
    langBtnTitle: 'Passer en français',
    sidebarTitle: 'Configuration',
    apiKeyTitle: '🔑 OpenRouter API Key',
    apiKeyHelp: 'Uses the key from the <code>.env</code> file by default. You can override it here if needed.',
    topicTitle: '🎯 Situation',
    topicPlaceholder: 'Current situation of the scene...',
    pastSituationsTitle: (n) => `📜 Past situations (${n})`,
    pastSituationsEmpty: "No past situations yet — the story hasn't moved.",
    pastSituationRestore: 'Click to make this the current situation again',
    charactersTitle: '👥 The 4 Characters',
    directorSummary: '🎬 Director Prompt',
    directorHelp: 'The Director decides who speaks next and whether an interruption occurs.',
    welcomeTitle: 'Welcome to Quatuor',
    welcomeSubtitle: 'An autonomous AI-powered group conversation simulator.',
    welcomeStep1: 'Pick or tweak your scenario in the top bar or the configuration panel.',
    welcomeStep2: 'Make sure an OpenRouter API key is configured (in the <code>.env</code> file or above).',
    welcomeStep3: 'Click <strong>Start</strong> to launch the infinite loop!',
    typingText: 'is thinking...',
    statusReady: 'Ready to start',
    statusRunning: 'Simulation running...',
    statusPaused: 'Paused',
    statusReset: 'Reset',
    statusDirector: 'The Director is choosing who speaks...',
    statusThinking: (name) => `${name} is thinking...`,
    statusWaiting: 'Waiting...',
    errorPrefix: 'Error',
    namePlaceholder: 'Name',
    charPromptPlaceholder: "Character's system prompt...",
    colorPickerTitle: 'Bubble color',
    stats: (n) => `${n} ${n === 1 ? 'line' : 'lines'}`,
    narratorName: 'Narrator',
    eventPlaceholder: 'Throw an event on stage... (e.g. "The lights suddenly go out")',
    eventSend: 'Inject',
    interruptBadge: 'INTERRUPTION ⚡',
  },
  fr: {
    scenarioLabel: 'Scénario',
    speedLabel: 'Vitesse',
    modelLabel: 'Modèle',
    speedFast: 'Rapide (1.5s)',
    speedNormal: 'Normal (3s)',
    speedSlow: 'Lent (5s)',
    start: 'Lancer',
    pause: 'Pause',
    resume: 'Relancer',
    reset: 'Reset',
    configBtnTitle: 'Configurer les personnages',
    langBtnLabel: 'EN',
    langBtnTitle: 'Switch to English',
    sidebarTitle: 'Configuration',
    apiKeyTitle: '🔑 Clé API OpenRouter',
    apiKeyHelp: "Utilise la clé du fichier <code>.env</code> par défaut. Vous pouvez l'écraser ici si besoin.",
    topicTitle: '🎯 Situation',
    topicPlaceholder: 'Situation actuelle de la scène...',
    pastSituationsTitle: (n) => `📜 Situations passées (${n})`,
    pastSituationsEmpty: "Aucune situation passée — l'histoire n'a pas encore évolué.",
    pastSituationRestore: 'Cliquez pour redéfinir cette situation comme actuelle',
    charactersTitle: '👥 Les 4 Personnages',
    directorSummary: '🎬 Invite du Régisseur (Director)',
    directorHelp: "Le Régisseur décide qui parle et si une interruption a lieu.",
    welcomeTitle: 'Bienvenue dans Quatuor',
    welcomeSubtitle: "Un simulateur de conversation de groupe autonome propulsé par l'IA.",
    welcomeStep1: 'Choisissez ou modifiez votre scénario dans la barre du haut ou le panneau de configuration.',
    welcomeStep2: "Assurez-vous qu'une clé API OpenRouter est configurée (dans le fichier <code>.env</code> ou ci-dessus).",
    welcomeStep3: 'Cliquez sur <strong>Lancer</strong> pour démarrer la boucle infinie !',
    typingText: 'réfléchit...',
    statusReady: 'Prêt à démarrer',
    statusRunning: 'Simulation en cours...',
    statusPaused: 'En pause',
    statusReset: 'Réinitialisé',
    statusDirector: 'Le Régisseur choisit qui parle...',
    statusThinking: (name) => `${name} réfléchit...`,
    statusWaiting: 'En attente...',
    errorPrefix: 'Erreur',
    namePlaceholder: 'Nom',
    charPromptPlaceholder: 'System prompt du personnage...',
    colorPickerTitle: 'Couleur de bulle',
    stats: (n) => `${n} réplique${n > 1 ? 's' : ''}`,
    narratorName: 'Narrateur',
    eventPlaceholder: "Lancez un événement sur scène... (ex : « Les lumières s'éteignent brusquement »)",
    eventSend: 'Injecter',
    interruptBadge: 'COUPURE DE PAROLE ⚡',
  },
};

export const PROMPTS = {
  en: {
    emptyTranscript: "The discussion has just started. No message has been sent yet. Choose the first speaker.",
    interruptTag: ' (CUTTING IN)',
    eventTag: '⚡ STAGE EVENT (Narrator)',
    fallbackReason: 'Fallback regulator (Round-Robin).',
    apiErrorReplica: (emoji) => `${emoji} *seems lost in thought...* (API Error)`,
    directorUserPrompt: ({ situation, pastSituations, transcript }) => `Current situation of the scene: ${situation}
${pastSituations.length ? `\nPast situations (the story so far, oldest first):\n${pastSituations.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n` : ''}
Here is the current state of the discussion:
${transcript}

Choose the next speaker, update the situation if the story has moved forward, and reply in strict JSON format.`,
    characterInstructions: ({ situation, pastSituations, historyText, speaker }) => `Current situation of the scene: ${situation}
${pastSituations.length ? `\nThe story so far went through these past situations (oldest first):\n${pastSituations.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n` : ''}
Here is the transcript of the discussion so far:
${historyText || '(Start of the conversation)'}

It is now your turn to speak as ${speaker.name} (${speaker.emoji}).

⚠️ INTELLIGENCE AND CONTINUITY RULE:
- Carefully analyze the transcript. If one of your previous actions (or someone else's) failed or caused damage/injuries described by the Game Master (or criticized by other speakers), you must ABSOLUTELY NOT repeat that same action.
- React directly to the actual consequences (e.g., if you were hurt, knocked to the ground, or insulted, say so out loud and adjust your state of mind).
- Change tactics, suggest an alternative, look for another angle, or argue with the others about what to do next. Move the situation forward instead of stalling.

Write your line directly (1 to 3 short sentences maximum, very dynamic and natural).
Do not start your reply with your name (like "${speaker.name}:"), and do not wrap your whole line in quotation marks.`,
    interruptInstruction: (prevSpeaker) => `\n\n⚠️ IMPORTANT: You are cutting ${prevSpeaker} off mid-sentence! Write your message accordingly, showing the abrupt interruption (e.g., start with "Wait, but...", "No, that's wrong!", "Sorry to interrupt, but...").`,
    continueInstruction: `\n\nSmoothly weave in your reactions to what the other characters said in the transcript and build on it.`,
  },
  fr: {
    emptyTranscript: "La discussion vient de commencer. Aucun message n'a encore été envoyé. Choisis le premier intervenant.",
    interruptTag: ' (COUPANT LA PAROLE)',
    eventTag: '⚡ ÉVÉNEMENT DE SCÈNE (Narrateur)',
    fallbackReason: 'Régulateur de secours (Round-Robin).',
    apiErrorReplica: (emoji) => `${emoji} *semble perdu dans ses pensées...* (Erreur API)`,
    directorUserPrompt: ({ situation, pastSituations, transcript }) => `Situation actuelle de la scène : ${situation}
${pastSituations.length ? `\nSituations passées (l'histoire jusqu'ici, de la plus ancienne à la plus récente) :\n${pastSituations.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n` : ''}
Voici l'état actuel de la discussion :
${transcript}

Choisis le prochain intervenant, mets à jour la situation si l'histoire a progressé, et réponds au format JSON strict.`,
    characterInstructions: ({ situation, pastSituations, historyText, speaker }) => `Situation actuelle de la scène : ${situation}
${pastSituations.length ? `\nL'histoire est passée par ces situations (de la plus ancienne à la plus récente) :\n${pastSituations.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n` : ''}
Voici la transcription de la discussion jusqu'ici :
${historyText || '(Début de la conversation)'}

C'est à ton tour de parler en tant que ${speaker.name} (${speaker.emoji}).

⚠️ RÈGLE D'INTELLIGENCE ET DE SÉQUENTIALITÉ :
- Analyse attentivement la transcription. Si une de tes actions précédentes (ou celle d'un autre) a échoué ou a causé des dégâts/blessures décrits par le Maître du Jeu (ou critiqués par d'autres intervenants), tu ne dois ABSOLUMENT PAS répéter cette même action.
- Réagis directement aux conséquences réelles (ex: si tu as été blessé, projeté au sol, ou insulté, exprime-le verbalement et adapte ton état d'esprit).
- Change de tactique, propose une alternative, cherche un autre angle, ou dispute-toi avec les autres sur la marche à suivre. Fais progresser la situation au lieu de stagner.

Rédige directement ta réplique (1 à 3 phrases courtes maximum, très dynamique, naturelle).
Ne commence pas ta réponse par ton nom (comme "${speaker.name} :"), et n'utilise pas de guillemets autour de toute ta réplique.`,
    interruptInstruction: (prevSpeaker) => `\n\n⚠️ IMPORTANT: Tu coupes directement la parole à ${prevSpeaker} ! Rédige ton message en conséquence, en montrant l'interruption brusque (ex: commence par "Attends, mais...", "Non, c'est faux !", "Désolé d'interrompre, mais...").`,
    continueInstruction: `\n\nIntègre de manière fluide tes réactions aux propos des autres personnages de la transcription et rebondis dessus.`,
  },
};
