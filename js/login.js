import { db } from "./firebase.js";
import {
    collection,
    deleteDoc,
    doc,
    query,
    where,
    updateDoc,
    onSnapshot,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const clienteId = "cynthia";
const senhaCorreta = "1234";

const horariosFixos = [
    "07:00", "08:00", "09:00", "10:00",
    "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00",
    "17:00", "18:00", "19:00",
];

let agendamentos = [];
let selecionado = null;
let horaSelecionada = null;
let primeiraCarga = true;

// data hoje
const hoje = new Date().toLocaleDateString("sv-SE");
document.getElementById("data").value = hoje;

// LOGIN
document.getElementById("entrar").onclick = () => {
    if (document.getElementById("senha").value === senhaCorreta) {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("painel").style.display = "block";
        escutar();
    }
};

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

// 🔥 RENDER
function renderizar() {
    const agenda = document.getElementById("agenda");
    agenda.innerHTML = "";

    let total = 0;
    let totalAtendimentos = 0;
    let pendentes = 0;

    agendamentos.forEach(a => {

        // 🔥 IGNORA horários manuais
        if (a.livreManual) return;

        if (!a.bloqueado) {
            totalAtendimentos++;

            if (a.preco) total += Number(a.preco);

            if (a.status !== "realizado") pendentes++;
        }
    });

    document.getElementById("totalDia").textContent = "R$" + total;
    document.getElementById("totalAgendamentos").textContent = totalAtendimentos;
    document.getElementById("pendentes").textContent = pendentes;

    // 🔥 JUNTA HORÁRIOS FIXOS + NOVOS
    let todosHorarios = [...horariosFixos];

    agendamentos.forEach(a => {
        if (!todosHorarios.includes(a.hora)) {
            todosHorarios.push(a.hora);
        }
    });

    // ordena
    todosHorarios.sort();

    // 🔥 RENDERIZA
    todosHorarios.forEach(hora => {

        const item = agendamentos.find(a => a.hora === hora);

        const div = document.createElement("div");
        div.classList.add("horario");

        if (item && !item.livreManual) {
            if (item.bloqueado) {
                div.classList.add("ocupado");
                div.innerHTML = `${hora} 🔒`;
            } else {
                div.classList.add("ocupado");

                if (item.status === "realizado") {
                    div.classList.add("realizado");
                }

                div.innerHTML = `${hora}<br>${item.nome || ""}`;
            }

        } else {
            div.classList.add("livre");
            div.innerHTML = hora;
        }

        div.onclick = () => abrirModal(hora, item);

        agenda.appendChild(div);
    });
}

// 🔥 MODAL
function abrirModal(hora, item) {
    selecionado = item;
    horaSelecionada = hora;

    document.getElementById("modal").style.display = "flex";
    document.getElementById("modalHora").textContent = hora;

    if (item) {
        document.getElementById("modalInfo").textContent =
            item.bloqueado
                ? "Horário bloqueado"
                : `${item.nome} - ${item.servico || ""}`;
    } else {
        document.getElementById("modalInfo").textContent = "Horário livre";
    }

    const btnBloquear = document.getElementById("btnBloquear");
    btnBloquear.textContent =
        item && item.bloqueado ? "🔓 Desbloquear" : "🔒 Bloquear";
}

// fechar modal clicando fora
window.addEventListener("click", (e) => {
    const modal = document.getElementById("modal");
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// 🔥 ALERTA
function mostrarAlerta(msg) {
    const el = document.getElementById("alerta");
    el.textContent = msg;
    el.classList.add("show");

    setTimeout(() => {
        el.classList.remove("show");
    }, 3000);
}

// 🔥 REALIZADO
document.getElementById("btnRealizado").onclick = async () => {
    if (!selecionado) return;

    await updateDoc(
        doc(db, "clientes", clienteId, "agendamentos", selecionado.id),
        { status: "realizado" }
    );

    document.getElementById("modal").style.display = "none";
};

// 🔥 CANCELAR
document.getElementById("btnCancelar").onclick = async () => {
    if (!selecionado) return;

    await deleteDoc(
        doc(db, "clientes", clienteId, "agendamentos", selecionado.id)
    );

    document.getElementById("modal").style.display = "none";
};

// 🔥 BLOQUEAR
document.getElementById("btnBloquear").onclick = async () => {
    const data = document.getElementById("data").value;

    if (selecionado && selecionado.bloqueado) {
        await deleteDoc(
            doc(db, "clientes", clienteId, "agendamentos", selecionado.id)
        );
    } else {
        await addDoc(
            collection(db, "clientes", clienteId, "agendamentos"),
            {
                data,
                hora: horaSelecionada,
                bloqueado: true
            }
        );
    }

    document.getElementById("modal").style.display = "none";
};

// mudar data
document.getElementById("data").addEventListener("change", escutar);

document.getElementById("btnAddHora").onclick = async () => {

    const data = document.getElementById("data").value;

    const novaHora = prompt("Digite o novo horário (ex: 08:30)");

    if (!novaHora) return;

    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!regex.test(novaHora)) {
        alert("Formato inválido! Use 08:30");
        return;
    }

    const jaExiste = agendamentos.find(a => a.hora === novaHora);

    if (jaExiste) {
        alert("Esse horário já existe!");
        return;
    }

    await addDoc(
        collection(db, "clientes", clienteId, "agendamentos"),
        {
            data,
            hora: novaHora,
            livreManual: true
        }
    );

    document.getElementById("modal").style.display = "none";
};