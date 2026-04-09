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
const clienteId = "cynthia"; // ALTERA PRA CADA CLIENTE
const numeroDono = "5512999999999"; // ALTERA

// horários fixos
const horariosFixos = [
    "08:00","09:00","10:00",
    "11:00","12:00","13:00",
    "14:00","15:00","16:00",
    "17:00","18:00"
];

let horarioSelecionado = null;
let servicoSelecionado = null;
let ocupados = [];

// inputs
const nomeInput = document.getElementById("nome");
const telInput = document.getElementById("telefone");

// salvar dados local
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

// 🔹 buscar ocupados
async function buscar(data) {
    const q = query(
        collection(db, "clientes", clienteId, "agendamentos"),
        where("data", "==", data)
    );

    const snap = await getDocs(q);

    ocupados = [];
    snap.forEach(doc => ocupados.push(doc.data().hora));
}

// 🔹 render horários
async function renderizar(data) {
    const div = document.getElementById("horarios");
    div.innerHTML = "⏳";

    await buscar(data);

    div.innerHTML = "";

    horariosFixos.forEach(h => {
        const el = document.createElement("div");
        el.textContent = h;
        el.classList.add("horario");

        if (ocupados.includes(h)) {
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

// 🔹 AGENDAR
document.getElementById("agendar").onclick = async () => {
    const nome = nomeInput.value;
    const tel = telInput.value;
    const data = document.getElementById("data").value;

    if (!nome || !tel || !servicoSelecionado || !horarioSelecionado) {
        mostrarBanner("⚠️ Preencha tudo!");
        return;
    }

    if (ocupados.includes(horarioSelecionado)) {
        mostrarBanner("❌ Horário ocupado!");
        return;
    }

    // salvar local
    localStorage.setItem("nome", nome);
    localStorage.setItem("tel", tel);

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

    // mensagem whatsapp
    const msg = encodeURIComponent(
        `💖 NOVO AGENDAMENTO

👩 Cliente: ${nome}
📞 Telefone: ${tel}

📅 Data: ${data}
⏰ Hora: ${horarioSelecionado}
💅 Serviço: ${servicoSelecionado.nome}
💰 Valor: R$${servicoSelecionado.preco}`
    );

    window.open(`https://wa.me/${numeroDono}?text=${msg}`, "_blank");

    mostrarBanner("💖 Agendamento enviado!");

    renderizar(data);
    carregarHistorico();
};

// 🔹 HISTÓRICO
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

// 🔹 CANCELAR
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

// 🔥 TEMPO REAL
function escutar() {
    const data = document.getElementById("data").value;

    const q = query(
        collection(db, "clientes", clienteId, "agendamentos"),
        where("data", "==", data)
    );

    onSnapshot(q, (snap) => {

        if (!primeiraCarga && snap.docChanges().length > 0) {
            mostrarAlerta("🔔 Novo agendamento!");
        }

        primeiraCarga = false;

        agendamentos = [];
        snap.forEach(d => agendamentos.push({ id: d.id, ...d.data() }));

        renderizar();
    });
}