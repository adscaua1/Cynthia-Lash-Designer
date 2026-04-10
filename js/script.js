import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 CONFIG
const clienteId = "cynthia";
const numeroDono = "5512996879726";

// horários fixos
const horariosFixos = [
    "07:00", "08:00", "09:00", "10:00",
    "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00",
    "17:00", "18:00", "19:00"
];

let horarioSelecionado = null;
let servicoSelecionado = null;
let agendamentos = [];

// inputs
const nomeInput = document.getElementById("nome");
const telInput = document.getElementById("telefone");

// salvar local
nomeInput.value = localStorage.getItem("nome") || "";
telInput.value = localStorage.getItem("tel") || "";

// data hoje
const hoje = new Date().toLocaleDateString("sv-SE");
document.getElementById("data").value = hoje;

// banner
function mostrarBanner(msg) {
    const banner = document.getElementById("banner");
    banner.textContent = msg;
    banner.classList.add("show");

    setTimeout(() => {
        banner.classList.remove("show");
    }, 3000);
}

// selecionar serviço
document.querySelectorAll(".card-servico").forEach(card => {
    card.onclick = () => {
        document.querySelectorAll(".card-servico")
            .forEach(c => c.classList.remove("ativo"));

        card.classList.add("ativo");

        servicoSelecionado = {
            nome: card.dataset.servico,
            preco: card.dataset.preco
        };
    };
});

// buscar dados
async function buscar(data) {
    const q = query(
        collection(db, "clientes", clienteId, "agendamentos"),
        where("data", "==", data)
    );

    const snap = await getDocs(q);

    agendamentos = [];
    snap.forEach(doc => {
        agendamentos.push({ id: doc.id, ...doc.data() });
    });
}

// render horários
async function renderizar(data) {

    const div = document.getElementById("horarios");

    const diaSemana = new Date(data + "T00:00:00").getDay();
    if (diaSemana === 0 || diaSemana === 1) {
        div.innerHTML = "🚫 Não atendemos neste dia";
        return;
    }

    div.innerHTML = "⏳";

    await buscar(data);

    div.innerHTML = "";

    let todosHorarios = [...horariosFixos];

    agendamentos.forEach(a => {
        if (!todosHorarios.includes(a.hora)) {
            todosHorarios.push(a.hora);
        }
    });

    todosHorarios.sort();

    todosHorarios.forEach(h => {

        const item = agendamentos.find(a => a.hora === h);

        const el = document.createElement("div");
        el.textContent = h;
        el.classList.add("horario");

        if (item && !item.livreManual) {
            el.classList.add("ocupado");
        } else {
            el.classList.add("livre");

            el.onclick = () => {
                document.querySelectorAll(".horario")
                    .forEach(e => e.classList.remove("ativo"));

                el.classList.add("ativo");
                horarioSelecionado = h;
            };
        }

        div.appendChild(el);
    });
}

// 🔥 FUNÇÃO DE LIMPEZA (evita "�")
function limparTexto(t) {
    return String(t)
        .normalize("NFC")
        .replace(/�/g, "");
}

// AGENDAR
document.getElementById("agendar").onclick = async () => {

    const nome = nomeInput.value;
    const tel = telInput.value;
    const data = document.getElementById("data").value;

    const diaSemana = new Date(data + "T00:00:00").getDay();
    if (diaSemana === 0 || diaSemana === 1) {
        mostrarBanner("🚫 Não atendemos neste dia");
        return;
    }

    if (!nome || !tel || !servicoSelecionado || !horarioSelecionado) {
        mostrarBanner("⚠️ Preencha tudo!");
        return;
    }

    const ocupado = agendamentos.find(
        a => a.hora === horarioSelecionado && !a.livreManual
    );

    if (ocupado) {
        mostrarBanner("❌ Horário ocupado!");
        return;
    }

    // remove manual
    const q = query(
        collection(db, "clientes", clienteId, "agendamentos"),
        where("data", "==", data),
        where("hora", "==", horarioSelecionado)
    );

    const snap = await getDocs(q);

    for (const d of snap.docs) {
        if (d.data().livreManual) {
            await deleteDoc(
                doc(db, "clientes", clienteId, "agendamentos", d.id)
            );
        }
    }

    // cria agendamento
    await addDoc(
        collection(db, "clientes", clienteId, "agendamentos"),
        {
            nome,
            telefone: tel,
            data,
            hora: horarioSelecionado,
            servico: servicoSelecionado.nome,
            preco: servicoSelecionado.preco,
            status: "pendente"
        }
    );

    // 💖 WHATSAPP CORRIGIDO (SEM BUG DE "�")
    const msg = encodeURIComponent(
        `💖 NOVO AGENDAMENTO

👩 ${limparTexto(nome)}
📅 ${data}
⏰ ${horarioSelecionado}
 ${limparTexto(servicoSelecionado.nome)}`
    );

    const urlWhats = `https://api.whatsapp.com/send?phone=${numeroDono}&text=${msg}`;

    const win = window.open(urlWhats, "_blank");

    if (!win) {
        window.location.href = urlWhats;
    }

    setTimeout(() => {
        window.location.href = urlWhats;
    }, 300);

    mostrarBanner("💖 Agendamento enviado!");

    renderizar(data);
    carregarHistorico();
};

// HISTÓRICO
async function carregarHistorico() {

    const div = document.getElementById("historico");
    div.innerHTML = "⏳";

    const tel = localStorage.getItem("tel");

    if (!tel) {
        div.innerHTML = "Nenhum agendamento";
        return;
    }

    const q = query(
        collection(db, "clientes", clienteId, "agendamentos"),
        where("telefone", "==", tel)
    );

    const snap = await getDocs(q);

    div.innerHTML = "";

    if (snap.empty) {
        div.innerHTML = "Nenhum agendamento";
        return;
    }

    snap.forEach(docSnap => {
        const item = docSnap.data();

        const el = document.createElement("div");
        el.classList.add("card-historico");

        el.innerHTML = `
        ⏰ ${item.hora} - ${item.servico}<br>
        💰 R$${item.preco}<br>
        📅 ${item.data}
        <button onclick="cancelar('${docSnap.id}')">Cancelar</button>
        `;

        div.appendChild(el);
    });
}

// CANCELAR
window.cancelar = async (id) => {
    await deleteDoc(
        doc(db, "clientes", clienteId, "agendamentos", id)
    );

    mostrarBanner("❌ Cancelado!");

    carregarHistorico();
    renderizar(document.getElementById("data").value);
};

// mudar data
document.getElementById("data").addEventListener("change", e => {
    renderizar(e.target.value);
});

// iniciar
renderizar(hoje);
carregarHistorico();