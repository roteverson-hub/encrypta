// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC8UGRrAwvAQ_PEy7STJwQWUSnE2-qWuII",
    authDomain: "encryptame-1.firebaseapp.com",
    projectId: "encryptame-1",
    storageBucket: "encryptame-1.appspot.com",
    messagingSenderId: "109950408456",
    appId: "1:109950408456:web:65492d295240c5f106603a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variáveis de estado
let originalWords = [];
let startTime = null;
let attempts = 0;
let hintUsed = false;
let hintMapping = {};

// Funções utilitárias
const loadingOverlay = document.getElementById("loading-overlay");
function showLoading() { loadingOverlay.classList.add("is-visible"); }
function hideLoading() { loadingOverlay.classList.remove("is-visible"); }

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('is-visible'));
    const el = document.getElementById(id);
    if (el) el.classList.add('is-visible');
}

function showGameUI(user) {
    showSection("game-section");
    document.getElementById("welcome").textContent = `👋 Bem-vindo, ${user}!`;
    document.getElementById("logout").style.display = "block";
    clearDailyBlockUI();
    loadRanking();
}

function showDailyBlockForUser() {
    const el = document.getElementById("alreadyPlayedMsg");
    if (el) el.style.display = "block";
    document.getElementById("instructions").style.display = "none";
    document.getElementById("loadChallenge").style.display = "none";
    document.getElementById("submitAnswers").style.display = "none";
    document.getElementById("showHintBtn").style.display = "none";
    const resultMsg = document.getElementById("result");
    resultMsg.textContent = "";
    resultMsg.classList.remove("win");
}

function showWinMessage() {
    const resultMsg = document.getElementById("result");
    resultMsg.classList.add("win");
    resultMsg.textContent = "Parabéns, você completou o desafio de hoje. Volte amanhã para solucionar mais um.";
    document.getElementById("loadChallenge").style.display = "none";
    document.getElementById("submitAnswers").style.display = "none";
    document.getElementById("showHintBtn").style.display = "none";
}

function clearDailyBlockUI() {
    const el = document.getElementById("alreadyPlayedMsg");
    if (el) el.style.display = "none";
    const resultMsg = document.getElementById("result");
    resultMsg.classList.remove("daily-block");
    resultMsg.classList.remove("win");
    resultMsg.textContent = "";
    resultMsg.style.color = "";
    document.getElementById("hintDisplay").textContent = "";
}

// Lógica de autenticação
onAuthStateChanged(auth, async (user) => {
    hideLoading();
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            let username = 'Usuário';
            if (docSnap.exists() && docSnap.data().username) {
                username = docSnap.data().username;
            }
            showGameUI(username);
            
            const today = new Date().toISOString().split('T')[0];
            const playedQuery = query(
                collection(db, "ranking"),
                where("userId", "==", user.uid),
                where("challengeDate", "==", today)
            );
            const playedSnap = await getDocs(playedQuery);
            if (!playedSnap.empty) showDailyBlockForUser();
            else document.getElementById("loadChallenge").style.display = "block";

        } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
            const errorMessageDiv = document.createElement('div');
            errorMessageDiv.textContent = 'Ocorreu um erro ao carregar seus dados.';
            errorMessageDiv.style.color = 'red';
            document.getElementById('appContainer').appendChild(errorMessageDiv);
        }
    } else {
        showSection("login-section");
    }
});

// Manipuladores de eventos de navegação
document.getElementById("goRegister").addEventListener("click", (e) => { e.preventDefault(); showSection("register-section"); });
document.getElementById("goLogin").addEventListener("click", (e) => { e.preventDefault(); showSection("login-section"); });
document.getElementById("goForgotPassword").addEventListener("click", (e) => { e.preventDefault(); showSection("forgot-password-section"); });
document.getElementById("goLoginFromForgotPassword").addEventListener("click", (e) => { e.preventDefault(); showSection("login-section"); });

// Manipuladores de eventos de autenticação
document.getElementById("btnRegister").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value.trim();
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value;
    const registerMsg = document.getElementById("registerMsg");
    if (!email || !username || !password) { registerMsg.textContent = "E-mail, nome de usuário e senha são obrigatórios."; return; }
    showLoading();
    try {
        const usernameQuery = query(collection(db, "users"), where("username", "==", username));
        const usernameSnap = await getDocs(usernameQuery);
        if (!usernameSnap.empty) { registerMsg.textContent = "Nome de usuário já existe. Escolha outro."; hideLoading(); return; }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            username: username,
            email: user.email,
            createdAt: new Date()
        });

        registerMsg.textContent = "Registro e login realizados com sucesso!";

    } catch (error) {
        console.error("Erro de registro:", error);
        let errorMessage = "Erro ao registrar. Tente novamente.";
        if (error.code === 'auth/email-already-in-use') errorMessage = 'Este e-mail já está em uso.';
        else if (error.code === 'auth/weak-password') errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        registerMsg.textContent = errorMessage;
    } finally { hideLoading(); }
});

document.getElementById("btnLogin").addEventListener("click", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const loginMsg = document.getElementById("loginMsg");
    if (!username || !password) { loginMsg.textContent = "Nome de usuário e senha obrigatórios."; return; }
    showLoading();
    try {
        const userQuery = query(collection(db, "users"), where("username", "==", username));
        const userSnapshot = await getDocs(userQuery);
        if (userSnapshot.empty) { loginMsg.textContent = "Nome de usuário ou senha inválidos."; hideLoading(); return; }

        const userData = userSnapshot.docs[0].data();
        const email = userData.email;
        await signInWithEmailAndPassword(auth, email, password);
        loginMsg.textContent = "Login realizado com sucesso!";

    } catch (error) {
        console.error("Erro de login:", error);
        let errorMessage = "Nome de usuário ou senha inválidos.";
        if (error.code === 'auth/wrong-password') errorMessage = 'Senha incorreta.';
        loginMsg.textContent = errorMessage;
    } finally { hideLoading(); }
});

document.getElementById("btnForgotPassword").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-password-email").value.trim();
    const forgotPasswordMsg = document.getElementById("forgotPasswordMsg");
    if (!email) { forgotPasswordMsg.textContent = "Por favor, digite seu e-mail."; return; }
    showLoading();
    try {
        await sendPasswordResetEmail(auth, email);
        forgotPasswordMsg.textContent = "Um link de recuperação de senha foi enviado para seu e-mail!";
        forgotPasswordMsg.style.color = "#10b981";
    } catch (error) {
        console.error("Erro ao enviar link de recuperação:", error);
        let errorMessage = "Erro ao enviar o link. Verifique o e-mail e tente novamente.";
        if (error.code === 'auth/user-not-found') errorMessage = 'Nenhuma conta encontrada com este e-mail.';
        forgotPasswordMsg.textContent = errorMessage;
        forgotPasswordMsg.style.color = "red";
    } finally { hideLoading(); }
});

document.getElementById("logout").addEventListener("click", async () => {
    showLoading();
    try { await signOut(auth); }
    catch (error) { console.error("Erro ao sair:", error); }
    finally { hideLoading(); }
});

// ==================== JOGO ====================
function normalizeString(str) { if (!str) return ""; return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function encryptWord(word, cipher) {
    if (!word || !cipher) return "";
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let encrypted = "";
    const normalizedWord = normalizeString(word).toUpperCase();
    for (let i = 0; i < normalizedWord.length; i++) {
        const char = normalizedWord[i];
        if (char >= 'A' && char <= 'Z') {
            const index = alphabet.indexOf(char);
            if (index !== -1) encrypted += cipher[index];
            else encrypted += char;
        } else encrypted += char;
    }
    return encrypted;
}

// NOVO CÁLCULO DE PONTOS
function calculatePoints(answerTime, attempts, hintUsed) {
    const basePoints = 1000;
    const timePenalty = answerTime * 5;
    const attemptsPenalty = (attempts - 1) * 50;
    const hintPenalty = hintUsed ? 100 : 0;
    let points = basePoints - timePenalty - attemptsPenalty - hintPenalty;
    return Math.max(50, Math.min(1000, points));
}

function applyHint(hintMapping) {
    for (const originalChar in hintMapping) {
        const encryptedChar = hintMapping[originalChar];
        const inputsToFill = document.querySelectorAll(`[data-encrypted-char="${encryptedChar}"]`);
        inputsToFill.forEach(input => {
            input.value = originalChar;
            input.disabled = true;
            // Correção aqui: Removido 'bg-gray-300' para usar a classe CSS `correct` do seu `style.css`
            input.classList.add('correct');
        });
    }
}

document.getElementById("loadChallenge").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    showLoading();
    try {
        const today = new Date().toISOString().split('T')[0];
        const playedQuery = query(collection(db, "ranking"), where("userId", "==", user.uid), where("challengeDate", "==", today));
        const playedSnap = await getDocs(playedQuery);
        if (!playedSnap.empty) { showDailyBlockForUser(); hideLoading(); return; }

        const challengeRef = doc(db, "desafios", today);
        const challengeSnap = await getDoc(challengeRef);
        if (challengeSnap.exists()) {
            const challengeData = challengeSnap.data();
            const words = [challengeData.short_word, challengeData.medium_word, challengeData.long_word];
            const cipher = challengeData.cipher_alpha;
            const cipheredWords = words.map(word => encryptWord(word, cipher));
            originalWords = words;
            document.getElementById("theme").textContent = `Tema: ${challengeData.theme || "Sem tema"}`;
            const challengeDiv = document.getElementById("challenge");
            challengeDiv.innerHTML = "";
            cipheredWords.forEach((word, wordIndex) => {
                const wordDiv = document.createElement("div");
                wordDiv.className = "challenge-word";
                const encryptedDisplay = word.split('').join(' ');
                wordDiv.innerHTML = `<p class="encrypted-text">${encryptedDisplay}</p>`;
                const inputContainer = document.createElement("div");
                inputContainer.className = "input-container";
                for (let i = 0; i < word.length; i++) {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.maxLength = "1";
                    input.className = "letter-input w-8 h-8";
                    input.setAttribute("data-word-index", wordIndex);
                    input.setAttribute("data-letter-index", i);
                    input.setAttribute("data-encrypted-char", word[i]);
                    input.addEventListener("input", (e) => {
                        if (e.target.value) {
                            const nextInput = document.querySelector(`[data-word-index="${wordIndex}"][data-letter-index="${i + 1}"]`);
                            if (nextInput) nextInput.focus();
                        }
                    });
                    input.addEventListener("keydown", (e) => {
                        if (e.key === "Backspace" && !e.target.value) {
                            const prevInput = document.querySelector(`[data-word-index="${wordIndex}"][data-letter-index="${i - 1}"]`);
                            if (prevInput) prevInput.focus();
                        }
                    });
                    inputContainer.appendChild(input);
                }
                wordDiv.appendChild(inputContainer);
                challengeDiv.appendChild(wordDiv);
            });

            hintUsed = false;
            hintMapping = {};
            const longWord = words[2];
            if (longWord && longWord.length >= 2) {
                const originalChars = normalizeString(longWord).toUpperCase().split('');
                const encryptedChars = encryptWord(longWord, challengeData.cipher_alpha).split('');
                const availableIndices = Array.from({ length: originalChars.length }, (_, i) => i);
                const randomIndices = [];
                while (randomIndices.length < 2 && availableIndices.length > 0) randomIndices.push(availableIndices.splice(Math.floor(Math.random() * availableIndices.length), 1)[0]);
                randomIndices.forEach(index => { hintMapping[originalChars[index]] = encryptedChars[index]; });
            }

            document.getElementById("instructions").style.display = "none";
            document.getElementById("loadChallenge").style.display = "none";
            document.getElementById("submitAnswers").style.display = "block";
            document.getElementById("showHintBtn").style.display = "block";
            document.getElementById("hintDisplay").textContent = "";
            clearDailyBlockUI();
            document.getElementById("result").textContent = "";
            startTime = Date.now();
            attempts = 0;

        } else document.getElementById("theme").textContent = "Nenhum desafio encontrado para hoje.";

    } catch (err) { console.error("Erro ao carregar desafio:", err); }
    finally { hideLoading(); }
});

document.getElementById("showHintBtn").addEventListener("click", () => {
    if (hintUsed) { alert("Você já usou a dica para este desafio."); return; }
    hintUsed = true;
    document.getElementById("showHintBtn").disabled = true;
    document.getElementById("showHintBtn").textContent = "Dica Usada";
    // Correção aqui: Removido 'bg-gray-300' para manter o estilo do botão consistente
    document.getElementById("showHintBtn").classList.add('disabled-btn-style');
    let hintText = "Dica: ";
    for (const original in hintMapping) hintText += `${original} → ${hintMapping[original]}; `;
    document.getElementById("hintDisplay").textContent = hintText;
    applyHint(hintMapping);
});

document.getElementById("submitAnswers").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    showLoading();
    attempts++;
    let correctCount = 0;
    originalWords.forEach((answer, wordIndex) => {
        const inputs = document.querySelectorAll(`[data-word-index="${wordIndex}"]`);
        let guessedWord = "";
        inputs.forEach(input => guessedWord += input.value);
        const normalizedGuessedWord = normalizeString(guessedWord).toUpperCase();
        const normalizedAnswer = normalizeString(String(answer || "")).toUpperCase();
        if (normalizedGuessedWord === normalizedAnswer) correctCount++;
        inputs.forEach(input => {
            if (!input.disabled) {
                // CORREÇÃO AQUI: Substituindo as classes do Tailwind por suas classes CSS
                input.classList.remove('correct', 'incorrect');
                if (normalizedGuessedWord === normalizedAnswer) {
                    input.classList.add('correct');
                } else {
                    input.classList.add('incorrect');
                }
            }
        });
    });

    const resultMsg = document.getElementById("result");
    const isCorrect = (correctCount === originalWords.length);

    if (isCorrect) {
        resultMsg.textContent = "🎉 Parabéns! Você acertou todas!";
        resultMsg.style.color = "#10b981";
        const answerTime = Math.floor((Date.now() - startTime) / 1000);
        const points = calculatePoints(answerTime, attempts, hintUsed);

        try {
            const today = new Date().toISOString().split('T')[0];
            const alreadyQuery = query(collection(db, "ranking"), where("userId", "==", user.uid), where("challengeDate", "==", today));
            const alreadySnap = await getDocs(alreadyQuery);

            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);
            let username = 'Usuário';
            if (userSnap.exists()) username = userSnap.data().username || username;

            if (alreadySnap.empty) await addDoc(collection(db, "ranking"), {
                userId: user.uid,
                username: username,
                answerTime: answerTime,
                challengeDate: today,
                attempts: attempts,
                points: points,
                hintUsed: hintUsed,
                timestamp: new Date()
            });

            showWinMessage();
            loadRanking();

        } catch (err) {
            console.error("Erro ao salvar resultado no Firestore:", err);
            resultMsg.textContent = "Erro ao salvar seu resultado. Tente novamente.";
        }

    } else {
        resultMsg.textContent = `Você acertou ${correctCount} de ${originalWords.length}. Tente novamente.`;
        resultMsg.style.color = "#FFB300";
    }
    hideLoading();
});

async function loadRanking() {
    showLoading();
    try {
        const today = new Date().toISOString().split('T')[0];
        const dailyGamesQuery = query(collection(db, "ranking"), where("challengeDate", "==", today), orderBy("points", "desc"));
        const dailySnapshot = await getDocs(dailyGamesQuery);
        const dailyData = dailySnapshot.docs.map(doc => doc.data());
        const dailyBody = document.querySelector("#daily-ranking tbody");
        dailyBody.innerHTML = "";
        dailyData.forEach((row, idx) => {
            dailyBody.innerHTML += `<tr><td>${idx + 1}</td><td>${row.username}</td><td>${row.points}</td></tr>`;
        });

        // Ranking Global: soma pontos diretamente da coleção 'ranking'
        const rankingSnap = await getDocs(collection(db, "ranking"));
        const pointsMap = {};
        rankingSnap.docs.forEach(doc => {
            const data = doc.data();
            if (!pointsMap[data.userId]) pointsMap[data.userId] = { username: data.username, points: 0 };
            pointsMap[data.userId].points += data.points;
        });
        const globalData = Object.values(pointsMap).sort((a,b) => b.points - a.points).slice(0, 10);
        const globalBody = document.querySelector("#global-ranking tbody");
        globalBody.innerHTML = "";
        globalData.forEach((row, idx) => {
            globalBody.innerHTML += `<tr><td>${idx + 1}</td><td>${row.username}</td><td>${row.points}</td></tr>`;
        });

        document.getElementById("ranking-section").classList.remove("hidden");

    } catch (err) {
        console.error("Erro ao carregar ranking:", err);
    } finally { hideLoading(); }
}
