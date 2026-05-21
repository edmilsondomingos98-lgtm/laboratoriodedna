class DNAGame {
    constructor() {
        this.currentLevel = 1;
        this.score = 0;
        this.lives = 3;
        this.timer = 60;
        this.timerInterval = null;
        this.dnaSequence = [];
        this.isTraining = false;
        this.playerName = '';
        this.isPaused = false;
        this.correctPairs = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C', 'U': 'A' };
        this.rnaPairs = { 'A': 'U', 'T': 'A', 'C': 'G', 'G': 'C' };
        
        // Dados do Ranking
        this.ranking = JSON.parse(localStorage.getItem('dna_ranking')) || [
            { name: "Dr. Watson", score: 500 },
            { name: "Rosalind Franklin", score: 450 },
            { name: "Francis Crick", score: 400 }
        ];
        
        this.init();
    }

    init() {
        this.setupDragAndDrop();
        document.getElementById('next-level-btn').onclick = () => this.nextLevel();
        document.getElementById('skip-dialogue-btn').onclick = () => this.finishCutscene();
        this.updateRankingUI();
        this.playBackgroundMusic();
    }

    playBackgroundMusic() {
        const bgMusic = document.getElementById('background-music');
        bgMusic.volume = 0.3;
        bgMusic.play().catch(e => console.log('Áudio desabilitado:', e));
    }

    playSound(soundId) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Som não reproduzido:', e));
            
            // Se for um som de ação (correto/erro), para após 1 segundo para ser um efeito curto
            if (soundId === 'correct-sound' || soundId === 'error-sound') {
                setTimeout(() => {
                    sound.pause();
                    sound.currentTime = 0;
                }, 1000);
            }
        }
    }

    showPlayerNameModal() {
        document.getElementById('player-name-modal').classList.add('active');
        document.getElementById('player-name-input').focus();
        
        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startGameWithName();
        });
    }

    startGameWithName() {
        const name = document.getElementById('player-name-input').value.trim();
        if (name.length < 2) {
            alert('Por favor, insira um nome válido (mínimo 2 caracteres)');
            return;
        }
        
        this.playerName = name;
        document.getElementById('player-name-modal').classList.remove('active');
        document.getElementById('player-name-display').textContent = this.playerName;
        this.startLevel(1);
    }

    finishCutscene() {
        // Removido playSound('level-complete-sound') para evitar sobreposição de áudio
        this.showScreen('game-screen');
        if (!this.isTraining) this.startTimer();
    }

    showCutscene(level) {
        const dialogues = {
            1: "Bem-vindo ao laboratório! O DNA é como um manual de instruções da vida. Para começar, você deve aprender a emparelhar as bases: Adenina (A) com Timina (T) e Citosina (C) com Guanina (G).",
            2: "Excelente! Agora vamos falar de Replicação. Quando uma célula se divide, ela precisa copiar seu DNA. Sua missão é montar a nova fita complementar seguindo as mesmas regras de emparelhamento.",
            3: "Atenção! Às vezes ocorrem erros chamados Mutações. Elas podem ser causadas por radiação ou erros químicos. Identifique a base que está no lugar errado e corrija-a clicando nela!",
            4: "Hora de transcrever! O RNA é o mensageiro que leva a informação do DNA. Mas cuidado: no RNA não existe Timina (T), usamos a Uracila (U) para se ligar à Adenina (A).",
            5: "O desafio final: Síntese de Proteínas! Cada grupo de 3 bases de RNA forma um 'Códon', que codifica um aminoácido. Monte as sequências para construir a proteína que a célula precisa!"
        };

        document.getElementById('dialogue-text').textContent = dialogues[level];
        this.showScreen('cutscene-screen');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        if (screenId === 'ranking-screen') this.updateRankingUI();
    }

    updateRankingUI() {
        const list = document.getElementById('ranking-list');
        const sorted = this.ranking.sort((a, b) => b.score - a.score).slice(0, 10);
        list.innerHTML = sorted
            .map((entry, i) => `<p><strong>${i + 1}.</strong> ${entry.name} - ${entry.score} pts</p>`)
            .join('');
    }

    setupDragAndDrop() {
        const baseItems = document.querySelectorAll('.base-item');
        let draggedBase = null;
        let touchGhost = null;

        // Previne o comportamento padrão de arrastar imagens e o scroll ao tocar nos itens
        document.addEventListener('touchmove', (e) => {
            if (e.target.classList.contains('base-item') || touchGhost) {
                e.preventDefault();
            }
        }, { passive: false });

        baseItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                if (this.isPaused) {
                    e.preventDefault();
                    return;
                }
                draggedBase = e.target.dataset.base;
                e.dataTransfer.setData('text/plain', draggedBase);
            });
        });

        const board = document.getElementById('dna-strand-right');
        board.addEventListener('dragover', (e) => e.preventDefault());
        board.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.isPaused) return;
            const base = e.dataTransfer.getData('text/plain') || draggedBase;
            const slot = e.target.closest('.base-slot');
            if (slot && !slot.classList.contains('filled')) {
                this.handleDrop(slot, base);
            }
        });

        // Touch Support
        baseItems.forEach(item => {
            item.addEventListener('touchstart', (e) => {
                if (this.isPaused) return;
                draggedBase = e.target.dataset.base;
                item.style.opacity = '0.5';
                
                // Cria o "fantasma" do item sendo arrastado
                touchGhost = item.cloneNode(true);
                touchGhost.style.position = 'fixed';
                touchGhost.style.left = e.touches[0].clientX + 'px';
                touchGhost.style.top = e.touches[0].clientY + 'px';
                touchGhost.style.transform = 'translate(-50%, -50%) scale(1.1)';
                touchGhost.style.zIndex = '1000';
                touchGhost.style.pointerEvents = 'none';
                touchGhost.style.opacity = '0.8';
                document.body.appendChild(touchGhost);
            }, {passive: false});

            item.addEventListener('touchmove', (e) => {
                if (touchGhost) {
                    touchGhost.style.left = e.touches[0].clientX + 'px';
                    touchGhost.style.top = e.touches[0].clientY + 'px';
                }
            }, {passive: false});

            item.addEventListener('touchend', (e) => {
                item.style.opacity = '1';
                if (touchGhost) {
                    document.body.removeChild(touchGhost);
                    touchGhost = null;
                }
                
                if (this.isPaused) return;
                
                const touch = e.changedTouches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                const slot = element ? element.closest('.base-slot') : null;
                
                if (slot && slot.closest('#dna-strand-right') && !slot.classList.contains('filled')) {
                    this.handleDrop(slot, draggedBase);
                }
            });
        });
    }

    handleDrop(slot, base) {
        const index = slot.dataset.index;
        const expected = slot.dataset.expected;
        
        slot.textContent = base;
        slot.classList.add('filled');
        slot.style.backgroundColor = this.getBaseColor(base);

        if (base === expected) {
            slot.classList.add('correct');
            this.score += 10;
            this.playSound('correct-sound');
            this.updateHUD();
            this.checkLevelComplete();
        } else {
            slot.classList.add('wrong');
            this.lives--;
            this.playSound('error-sound');
            this.updateHUD();
            if (this.lives <= 0) this.gameOver();
            
            setTimeout(() => {
                slot.textContent = '';
                slot.classList.remove('filled', 'wrong');
                slot.style.backgroundColor = '';
            }, 1000);
        }
    }

    getBaseColor(base) {
        const colors = { 'A': '#4CAF50', 'T': '#F44336', 'C': '#2196F3', 'G': '#FFEB3B', 'U': '#9C27B0' };
        return colors[base] || '#fff';
    }

    updateHUD() {
        document.getElementById('level-display').textContent = this.currentLevel;
        document.getElementById('timer-display').textContent = this.timer;
        document.getElementById('lives-display').textContent = this.lives;
        document.getElementById('score-display').textContent = this.score;
    }

    startLevel(level, isTraining = false) {
        this.currentLevel = level;
        this.isTraining = isTraining;
        this.lives = isTraining ? 999 : 3;
        this.timer = isTraining ? 999 : this.getLevelTime(level);
        
        this.generateLevelContent(level);
        this.updateHUD();
        
        const uracila = document.querySelector('.base-item[data-base="U"]');
        if (level >= 4) uracila.classList.remove('hidden');
        else uracila.classList.add('hidden');

        if (!isTraining) {
            this.showCutscene(level);
        } else {
            this.showScreen('game-screen');
            this.startTimer();
        }
    }

    getLevelTime(level) {
        if (level <= 2) return 60;
        if (level <= 4) return 40;
        return 20;
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.timer--;
                this.updateHUD();
                if (this.timer <= 0) {
                    clearInterval(this.timerInterval);
                    this.gameOver();
                }
            }
        }, 1000);
    }

    pauseGame() {
        if (document.getElementById('game-screen').classList.contains('active')) {
            this.isPaused = true;
            document.getElementById('pause-modal').classList.add('active');
        }
    }

    resumeGame() {
        this.isPaused = false;
        document.getElementById('pause-modal').classList.remove('active');
    }

    exitGame() {
        this.isPaused = false;
        clearInterval(this.timerInterval);
        document.getElementById('pause-modal').classList.remove('active');
        this.showScreen('start-screen');
    }

    generateLevelContent(level) {
        const leftStrand = document.getElementById('dna-strand-left');
        const rightStrand = document.getElementById('dna-strand-right');
        leftStrand.innerHTML = '';
        rightStrand.innerHTML = '';
        
        const bases = ['A', 'T', 'C', 'G'];
        const length = level === 5 ? 9 : 6;
        this.dnaSequence = Array.from({length}, () => bases[Math.floor(Math.random() * 4)]);

        const instruction = document.getElementById('level-instruction');
        
        this.dnaSequence.forEach((base, i) => {
            const leftSlot = document.createElement('div');
            leftSlot.className = 'base-slot filled';
            leftSlot.textContent = base;
            leftSlot.style.backgroundColor = this.getBaseColor(base);
            leftStrand.appendChild(leftSlot);

            const rightSlot = document.createElement('div');
            rightSlot.className = 'base-slot';
            rightSlot.dataset.index = i;
            
            let expected;
            if (level === 4 || level === 5) {
                expected = this.rnaPairs[base];
                instruction.textContent = level === 4 ? "Transforme DNA em RNA" : "Monte os códons para formar proteínas";
            } else {
                expected = this.correctPairs[base];
                instruction.textContent = level === 3 ? "Corrija os erros de emparelhamento" : "Emparelhe as bases corretamente";
            }
            
            rightSlot.dataset.expected = expected;
            rightStrand.appendChild(rightSlot);

            if (level === 5 && (i + 1) % 3 === 0 && i < length - 1) {
                leftSlot.style.marginBottom = "8px";
                rightSlot.style.marginBottom = "8px";
            }
        });

        if (level === 3) {
            const slots = rightStrand.querySelectorAll('.base-slot');
            const errorIndex = Math.floor(Math.random() * length);
            slots.forEach((slot, i) => {
                if (i !== errorIndex) {
                    const base = slot.dataset.expected;
                    slot.textContent = base;
                    slot.classList.add('filled', 'correct');
                    slot.style.backgroundColor = this.getBaseColor(base);
                } else {
                    const wrongBase = bases.find(b => b !== slot.dataset.expected);
                    slot.textContent = wrongBase;
                    slot.classList.add('filled', 'wrong');
                    slot.style.backgroundColor = this.getBaseColor(wrongBase);
                    slot.onclick = () => {
                        slot.textContent = '';
                        slot.classList.remove('filled', 'wrong');
                        slot.style.backgroundColor = '';
                        slot.onclick = null;
                    };
                }
            });
        }
    }

    checkLevelComplete() {
        const slots = document.querySelectorAll('#dna-strand-right .base-slot');
        const allCorrect = Array.from(slots).every(slot => slot.classList.contains('correct'));
        
        if (allCorrect) {
            clearInterval(this.timerInterval);
            this.showFeedback();
        }
    }

    showFeedback() {
        const facts = [
            "A Adenina sempre se liga à Timina no DNA.",
            "O DNA humano é 99,9% idêntico entre todas as pessoas.",
            "Mutações podem ser causadas por radiação ou erros na replicação.",
            "No RNA, a Timina é substituída pela Uracila.",
            "Cada sequência de 3 bases (códon) codifica um aminoácido."
        ];

        const titles = [
            "Geneticista Júnior",
            "Analista de Replicação",
            "Guardião do Genoma",
            "Mestre do RNA",
            "Engenheiro de Proteínas"
        ];
        
        const title = titles[this.currentLevel - 1];
        document.getElementById('feedback-title').textContent = `Parabéns, ${this.playerName}!`;
        document.getElementById('feedback-text').textContent = `Você completou o Nível ${this.currentLevel}! Novo Título: ${title}`;
        document.getElementById('scientific-fact').textContent = facts[this.currentLevel - 1];
        
        if (!this.isTraining) {
            this.updateRanking();
        }

        this.showScreen('feedback-screen');
    }

    updateRanking() {
        const playerEntry = this.ranking.find(e => e.name === this.playerName);
        if (playerEntry) {
            playerEntry.score = Math.max(playerEntry.score, this.score);
        } else {
            this.ranking.push({ name: this.playerName, score: this.score });
        }
        localStorage.setItem('dna_ranking', JSON.stringify(this.ranking));
    }

    nextLevel() {
        if (this.currentLevel < 5) {
            this.startLevel(this.currentLevel + 1);
        } else {
            this.playSound('level-complete-sound');
            alert(`Parabéns, ${this.playerName}! Você é um Engenheiro de Proteínas! Pontuação Final: ${this.score}`);
            this.showScreen('start-screen');
        }
    }

    gameOver() {
        this.playSound('error-sound');
        alert("Fim de Jogo! Tente novamente.");
        this.showScreen('start-screen');
    }
}

const game = new DNAGame();
