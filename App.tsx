import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';

type Perfil = 'CLIENTE' | 'OPERADOR' | 'ADMINISTRADOR';

type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
};

type Filme = {
  id: number;
  titulo: string;
  descricao: string;
  duracao: number;
  classificacao: string;
  genero: string;
  imagem: string;
};

type Sala = { id: number; nome: string };

type Sessao = {
  id: number;
  filmeId: number;
  salaId: number;
  dataHora: string;
  preco: string | number;
  filme: Filme;
  sala: { id: number; nome: string };
};

type Assento = {
  id: number;
  codigo: string;
  fileira: string;
  numero: number;
  status: string;
};

type Ingresso = {
  id: number;
  codigo: string;
  criadoEm: string;
  utilizadoEm: string | null;
  reservaAssento: {
    status: string;
    assento: { codigo: string };
    reserva: {
      sessao: {
        dataHora: string;
        filme: { titulo: string };
        sala: { nome: string };
      };
    };
  };
};

type RelatorioSessao = {
  sessaoId: number;
  filme: string;
  sala: string;
  dataHora: string;
  precoIngresso: number;
  ingressosVendidos: number;
  capacidade: number;
  ocupacaoPercentual: number;
  faturamento: number;
};

type Relatorio = {
  resumo: {
    totalSessoes: number;
    ingressosVendidos: number;
    capacidadeTotal: number;
    faturamentoTotal: number;
    ocupacaoGeral: number;
  };
  sessoes: RelatorioSessao[];
};

const API = 'https://cinepass-backend-q1y2.onrender.com';

function avisar(mensagem: string) {
  if (Platform.OS === 'web') {
    window.alert(mensagem);
  } else {
    Alert.alert('CinePass', mensagem);
  }
}

export default function App() {
  const [filmes, setFilmes] = useState<Filme[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tela, setTela] = useState('inicio');

  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [senhaUsuario, setSenhaUsuario] = useState('');
  const [carregandoAutenticacao, setCarregandoAutenticacao] = useState(false);
  const [erroAutenticacao, setErroAutenticacao] = useState('');

  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [filmeSelecionado, setFilmeSelecionado] = useState<Filme | null>(null);
  const [carregandoSessoes, setCarregandoSessoes] = useState(false);

  const [assentos, setAssentos] = useState<Assento[]>([]);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<Sessao | null>(null);
  const [assentosSelecionados, setAssentosSelecionados] = useState<number[]>([]);
  const [carregandoAssentos, setCarregandoAssentos] = useState(false);
  const [reservando, setReservando] = useState(false);

  const [reservaId, setReservaId] = useState<number | null>(null);
  const [reservaAssentos, setReservaAssentos] = useState<string[]>([]);
  const [confirmandoCompra, setConfirmandoCompra] = useState(false);
  const [modoBalcao, setModoBalcao] = useState(false);

  const [codigoIngresso, setCodigoIngresso] = useState('');
  const [ingressoConsultado, setIngressoConsultado] = useState<Ingresso | null>(null);
  const [consultandoIngresso, setConsultandoIngresso] = useState(false);
  const [validandoIngresso, setValidandoIngresso] = useState(false);
  const [ingressosCliente, setIngressosCliente] = useState<Ingresso[]>([]);
  const [carregandoIngressosCliente, setCarregandoIngressosCliente] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState('');
  const [classificacao, setClassificacao] = useState('');
  const [genero, setGenero] = useState('');
  const [imagem, setImagem] = useState('');
  const [filmeEditandoId, setFilmeEditandoId] = useState<number | null>(null);

  const [salas, setSalas] = useState<Sala[]>([]);
  const [nomeSala, setNomeSala] = useState('');
  const [fileirasSala, setFileirasSala] = useState('');
  const [assentosPorFileiraSala, setAssentosPorFileiraSala] = useState('');
  const [cadastrandoSala, setCadastrandoSala] = useState(false);

  const [filmeSessaoId, setFilmeSessaoId] = useState<number | null>(null);
  const [salaSessaoId, setSalaSessaoId] = useState<number | null>(null);
  const [dataSessao, setDataSessao] = useState('');
  const [horaSessao, setHoraSessao] = useState('');
  const [precoSessao, setPrecoSessao] = useState('');
  const [carregandoSalas, setCarregandoSalas] = useState(false);
  const [cadastrandoSessao, setCadastrandoSessao] = useState(false);

  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);
  const [erroRelatorio, setErroRelatorio] = useState('');

  function headersAutenticados(json = false): HeadersInit {
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function salvarSessao(novoToken: string, novoUsuario: Usuario) {
    setToken(novoToken);
    setUsuario(novoUsuario);

    if (Platform.OS === 'web') {
      localStorage.setItem('cinepass_token', novoToken);
      localStorage.setItem('cinepass_usuario', JSON.stringify(novoUsuario));
    } else {
      await SecureStore.setItemAsync('cinepass_token', novoToken);
      await SecureStore.setItemAsync('cinepass_usuario', JSON.stringify(novoUsuario));
    }
  }

  async function sair() {
    setToken(null);
    setUsuario(null);
    setTela('inicio');
    setSenhaUsuario('');
    setErroAutenticacao('');

    if (Platform.OS === 'web') {
      localStorage.removeItem('cinepass_token');
      localStorage.removeItem('cinepass_usuario');
    } else {
      await SecureStore.deleteItemAsync('cinepass_token');
      await SecureStore.deleteItemAsync('cinepass_usuario');
    }
  }

  async function restaurarSessao() {
    try {
      const tokenSalvo = Platform.OS === 'web'
        ? localStorage.getItem('cinepass_token')
        : await SecureStore.getItemAsync('cinepass_token');
      const usuarioSalvo = Platform.OS === 'web'
        ? localStorage.getItem('cinepass_usuario')
        : await SecureStore.getItemAsync('cinepass_usuario');

      if (tokenSalvo && usuarioSalvo) {
        setToken(tokenSalvo);
        setUsuario(JSON.parse(usuarioSalvo) as Usuario);
      }
    } catch {
      await sair();
    }
  }

  async function fazerLogin() {
    if (!emailUsuario.trim() || !senhaUsuario) {
      setErroAutenticacao('Informe seu e-mail e sua senha.');
      return;
    }

    try {
      setCarregandoAutenticacao(true);
      setErroAutenticacao('');

      const resposta = await fetch(`${API}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailUsuario.trim(), senha: senhaUsuario }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || dados.mensagem || 'Não foi possível entrar.');
      }
      if (!dados.token || !dados.usuario) {
        throw new Error('A API não retornou token e usuário.');
      }

      await salvarSessao(dados.token, dados.usuario);
      setEmailUsuario('');
      setSenhaUsuario('');
      setTela('inicio');
      avisar(`Bem-vindo ao CinePass, ${dados.usuario.nome}!`);
    } catch (error) {
      setErroAutenticacao(error instanceof Error ? error.message : 'Erro ao realizar login.');
    } finally {
      setCarregandoAutenticacao(false);
    }
  }

  async function cadastrarUsuario() {
    if (!nomeUsuario.trim() || !emailUsuario.trim() || !senhaUsuario) {
      setErroAutenticacao('Preencha nome, e-mail e senha.');
      return;
    }
    if (senhaUsuario.length < 8) {
      setErroAutenticacao('A senha deve possuir pelo menos 8 caracteres.');
      return;
    }

    try {
      setCarregandoAutenticacao(true);
      setErroAutenticacao('');

      const resposta = await fetch(`${API}/usuarios/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeUsuario.trim(),
          email: emailUsuario.trim(),
          senha: senhaUsuario,
        }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || dados.mensagem || 'Erro ao cadastrar usuário.');
      }

      setNomeUsuario('');
      setEmailUsuario('');
      setSenhaUsuario('');
      setTela('login');
      avisar('Cadastro realizado com sucesso! Faça login para continuar.');
    } catch (error) {
      setErroAutenticacao(error instanceof Error ? error.message : 'Erro ao cadastrar usuário.');
    } finally {
      setCarregandoAutenticacao(false);
    }
  }

  function abrirPainelOperador() {
    if (!token || !usuario) {
      avisar('Faça login para acessar a área do operador.');
      setTela('login');
      return;
    }
    if (usuario.perfil !== 'OPERADOR' && usuario.perfil !== 'ADMINISTRADOR') {
      avisar('Seu usuário não possui permissão para acessar esta área.');
      return;
    }
    setTela('operador');
  }

  async function carregarFilmes() {
    try {
      setErro('');
      const resposta = await fetch(`${API}/filmes`);
      if (!resposta.ok) throw new Error('Erro ao buscar filmes.');
      setFilmes(await resposta.json());
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarSessoes(filme: Filme) {
    try {
      setCarregandoSessoes(true);
      setFilmeSelecionado(filme);
      setSessoes([]);
      const resposta = await fetch(`${API}/sessoes/filme/${filme.id}`);
      if (!resposta.ok) throw new Error('Erro ao buscar sessões.');
      setSessoes(await resposta.json());
      setTela('sessoes');
    } catch {
      avisar('Não foi possível carregar as sessões.');
    } finally {
      setCarregandoSessoes(false);
    }
  }

  async function carregarAssentos(sessao: Sessao) {
    try {
      setCarregandoAssentos(true);
      setSessaoSelecionada(sessao);
      setAssentos([]);
      setAssentosSelecionados([]);
      const resposta = await fetch(`${API}/sessoes/${sessao.id}/assentos`);
      if (!resposta.ok) throw new Error('Erro ao buscar assentos.');
      const dados = await resposta.json();
      setAssentos(dados.assentos);
      setTela('assentos');
    } catch {
      avisar('Não foi possível carregar os assentos.');
    } finally {
      setCarregandoAssentos(false);
    }
  }

  function selecionarAssento(id: number) {
    setAssentosSelecionados((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]
    );
  }

  async function reservarAssentos() {
    if (!token || !usuario) {
      avisar('Entre na sua conta para reservar assentos.');
      setTela('login');
      return;
    }
    if (!sessaoSelecionada || assentosSelecionados.length === 0) {
      avisar('Selecione pelo menos um assento.');
      return;
    }
    if (reservando) return;

    try {
      setReservando(true);
      const resposta = await fetch(`${API}/reservas`, {
        method: 'POST',
        headers: headersAutenticados(true),
        body: JSON.stringify({
          sessaoId: sessaoSelecionada.id,
          assentosIds: assentosSelecionados,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível realizar a reserva.');

      const codigos = dados.reserva.assentos.map(
        (item: { assento: { codigo: string } }) => item.assento.codigo
      );
      setReservaId(dados.reserva.id);
      setReservaAssentos(codigos);

      const atualizacao = await fetch(`${API}/sessoes/${sessaoSelecionada.id}/assentos`);
      if (atualizacao.ok) {
        const dadosAssentos = await atualizacao.json();
        setAssentos(dadosAssentos.assentos);
      }
      setAssentosSelecionados([]);
      setTela('pagamento');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao realizar reserva.');
      if (sessaoSelecionada) await carregarAssentos(sessaoSelecionada);
    } finally {
      setReservando(false);
    }
  }

  async function confirmarCompra() {
    if (!reservaId || confirmandoCompra) return;
    try {
      setConfirmandoCompra(true);
      const resposta = await fetch(`${API}/compras/${reservaId}/confirmar`, {
        method: 'POST',
        headers: headersAutenticados(),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível confirmar a compra.');

      const assentosCompra = dados.compra.assentos
        .map((item: { assento: { codigo: string } }) => item.assento.codigo)
        .join(', ');
      const codigos = dados.compra.assentos
        .map((item: { ingresso?: { codigo: string } | null }) => item.ingresso?.codigo || 'Não informado')
        .join('\n');
      const total = (
        dados.compra.assentos.length * Number(dados.compra.sessao.preco)
      ).toFixed(2).replace('.', ',');

      setReservaId(null);
      setReservaAssentos([]);
      avisar(
        `COMPRA CONFIRMADA!\n\nFilme: ${dados.compra.sessao.filme.titulo}\n` +
        `Sala: ${dados.compra.sessao.sala.nome}\nAssentos: ${assentosCompra}\n` +
        `Total: R$ ${total}\n\nCÓDIGOS DOS INGRESSOS:\n${codigos}\n\nAproveite o filme!`
      );
      if (sessaoSelecionada) await carregarAssentos(sessaoSelecionada);
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao confirmar a compra.');
      if (sessaoSelecionada) await carregarAssentos(sessaoSelecionada);
    } finally {
      setConfirmandoCompra(false);
    }
  }

  async function venderNoBalcao() {
    if (!token || !usuario || (usuario.perfil !== 'OPERADOR' && usuario.perfil !== 'ADMINISTRADOR')) {
      avisar('Apenas operadores podem realizar vendas no balcão.');
      return;
    }

    if (!sessaoSelecionada || assentosSelecionados.length === 0) {
      avisar('Selecione pelo menos um assento.');
      return;
    }

    if (reservando || confirmandoCompra) return;

    try {
      setReservando(true);

      const respostaReserva = await fetch(`${API}/reservas/balcao`, {
        method: 'POST',
        headers: headersAutenticados(true),
        body: JSON.stringify({
          sessaoId: sessaoSelecionada.id,
          assentosIds: assentosSelecionados,
        }),
      });

      const dadosReserva = await respostaReserva.json();
      if (!respostaReserva.ok) {
        throw new Error(dadosReserva.erro || 'Não foi possível reservar os assentos para a venda.');
      }

      const idReserva = dadosReserva.reserva.id;

      setConfirmandoCompra(true);

      const respostaCompra = await fetch(`${API}/compras/balcao/${idReserva}/confirmar`, {
        method: 'POST',
        headers: headersAutenticados(),
      });

      const dadosCompra = await respostaCompra.json();
      if (!respostaCompra.ok) {
        throw new Error(dadosCompra.erro || 'A reserva foi criada, mas não foi possível confirmar a venda.');
      }

      const compra = dadosCompra.compra;
      const codigosAssentos = compra.assentos
        .map((item: { assento: { codigo: string } }) => item.assento.codigo)
        .join(', ');
      const codigosIngressos = compra.assentos
        .map((item: { ingresso?: { codigo: string } | null }) => item.ingresso?.codigo || 'Não informado')
        .join('\\n');
      const total = (
        compra.assentos.length * Number(compra.sessao.preco)
      ).toFixed(2).replace('.', ',');

      setAssentosSelecionados([]);
      setModoBalcao(false);

      avisar(
        `VENDA NO BALCÃO CONFIRMADA!\\n\\nFilme: ${compra.sessao.filme.titulo}\\n` +
        `Sala: ${compra.sessao.sala.nome}\\nAssentos: ${codigosAssentos}\\n` +
        `Total: R$ ${total}\\n\\nCÓDIGOS DOS INGRESSOS:\\n${codigosIngressos}`
      );

      const respostaAssentos = await fetch(`${API}/sessoes/${sessaoSelecionada.id}/assentos`);
      if (respostaAssentos.ok) {
        const dadosAssentos = await respostaAssentos.json();
        setAssentos(dadosAssentos.assentos);
      }
      setTela('operador');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao realizar venda no balcão.');
      if (sessaoSelecionada) await carregarAssentos(sessaoSelecionada);
    } finally {
      setReservando(false);
      setConfirmandoCompra(false);
    }
  }

  async function consultarIngresso() {
    const codigo = codigoIngresso.trim().replace(/[\s"'`]/g, '');
    if (!codigo) {
      avisar('Informe o código do ingresso.');
      return;
    }
    try {
      setConsultandoIngresso(true);
      setIngressoConsultado(null);
      const resposta = await fetch(`${API}/ingressos/${encodeURIComponent(codigo)}`, {
        headers: headersAutenticados(),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || dados.mensagem || `Erro HTTP ${resposta.status}`);
      if (!dados.codigo || !dados.reservaAssento) throw new Error('Dados incompletos do ingresso.');
      setIngressoConsultado(dados);
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao consultar ingresso.');
    } finally {
      setConsultandoIngresso(false);
    }
  }

  async function validarIngresso() {
    if (!ingressoConsultado || validandoIngresso) return;
    if (ingressoConsultado.utilizadoEm) {
      avisar('Este ingresso já foi utilizado.');
      return;
    }
    try {
      setValidandoIngresso(true);
      const resposta = await fetch(
        `${API}/ingressos/${encodeURIComponent(ingressoConsultado.codigo)}/validar`,
        { method: 'POST', headers: headersAutenticados() }
      );
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível validar o ingresso.');
      setIngressoConsultado((atual) =>
        atual ? { ...atual, utilizadoEm: dados.ingresso.utilizadoEm } : null
      );
      avisar('Entrada validada com sucesso!');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao validar ingresso.');
    } finally {
      setValidandoIngresso(false);
    }
  }

  async function carregarMeusIngressos() {
    if (!token || !usuario) {
      avisar('Entre na sua conta para consultar seus ingressos.');
      setTela('login');
      return;
    }

    if (usuario.perfil !== 'CLIENTE') {
      avisar('Esta área é destinada aos clientes.');
      return;
    }

    try {
      setCarregandoIngressosCliente(true);

      const resposta = await fetch(`${API}/ingressos/meus`, {
        method: 'GET',
        headers: headersAutenticados(),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível carregar seus ingressos.');
      }

      setIngressosCliente(Array.isArray(dados) ? dados : []);
      setTela('meusIngressos');
    } catch (error) {
      avisar(
        error instanceof Error
          ? error.message
          : 'Erro ao consultar seus ingressos.'
      );
    } finally {
      setCarregandoIngressosCliente(false);
    }
  }

  function abrirEdicaoFilme(filme: Filme) {
    setFilmeEditandoId(filme.id);
    setTitulo(filme.titulo);
    setDescricao(filme.descricao);
    setDuracao(String(filme.duracao));
    setClassificacao(filme.classificacao);
    setGenero(filme.genero);
    setImagem(filme.imagem || '');
    setTela('cadastro');
  }

  async function cadastrarFilme() {
    if (!titulo.trim() || !descricao.trim() || !duracao.trim() || !classificacao.trim() || !genero.trim()) {
      avisar('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!Number.isInteger(Number(duracao)) || Number(duracao) <= 0) {
      avisar('Informe uma duração válida.');
      return;
    }

    try {
      const editando = filmeEditandoId !== null;

      const resposta = await fetch(
        editando ? `${API}/filmes/${filmeEditandoId}` : `${API}/filmes`,
        {
          method: editando ? 'PUT' : 'POST',
          headers: headersAutenticados(true),
          body: JSON.stringify({
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            duracao: Number(duracao),
            classificacao: classificacao.trim(),
            genero: genero.trim(),
            imagem: imagem.trim(),
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível salvar o filme.');
      }

      avisar(editando ? 'Filme atualizado com sucesso!' : 'Filme cadastrado com sucesso!');

      setFilmeEditandoId(null);
      setTitulo('');
      setDescricao('');
      setDuracao('');
      setClassificacao('');
      setGenero('');
      setImagem('');

      await carregarFilmes();
      setTela('filmes');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao salvar filme.');
    }
  }

  async function excluirFilme(id: number) {
    const confirmar = Platform.OS === 'web'
      ? window.confirm('Deseja realmente excluir este filme?')
      : true;
    if (!confirmar) return;

    try {
      const resposta = await fetch(`${API}/filmes/${id}`, {
        method: 'DELETE',
        headers: headersAutenticados(),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível excluir o filme.');
      setFilmes((atuais) => atuais.filter((filme) => filme.id !== id));
      avisar('Filme excluído com sucesso!');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao excluir filme.');
    }
  }

  async function carregarSalas() {
    try {
      setCarregandoSalas(true);
      const resposta = await fetch(`${API}/salas`, { headers: headersAutenticados() });
      if (!resposta.ok) throw new Error('Não foi possível carregar as salas.');
      const dados = await resposta.json();
      setSalas(Array.isArray(dados) ? dados : dados.salas || []);
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao carregar salas.');
    } finally {
      setCarregandoSalas(false);
    }
  }

  async function cadastrarSala() {
    const fileiras = Number(fileirasSala);
    const assentosPorFileira = Number(assentosPorFileiraSala);

    if (!nomeSala.trim()) {
      return avisar('Informe o nome da sala.');
    }

    if (!Number.isInteger(fileiras) || fileiras < 1 || fileiras > 26) {
      return avisar('Informe entre 1 e 26 fileiras.');
    }

    if (!Number.isInteger(assentosPorFileira) || assentosPorFileira < 1) {
      return avisar('Informe uma quantidade válida de assentos por fileira.');
    }

    try {
      setCadastrandoSala(true);

      const resposta = await fetch(`${API}/salas`, {
        method: 'POST',
        headers: headersAutenticados(true),
        body: JSON.stringify({
          nome: nomeSala.trim(),
          fileiras,
          assentosPorFileira,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.mensagem || 'Não foi possível cadastrar a sala.');
      }

      setSalas((atuais) => [...atuais, dados.sala]);
      setNomeSala('');
      setFileirasSala('');
      setAssentosPorFileiraSala('');

      avisar('Sala cadastrada com sucesso!');
      setTela('operador');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao cadastrar sala.');
    } finally {
      setCadastrandoSala(false);
    }
  }

  async function abrirCadastroSessao() {
    setFilmeSessaoId(null);
    setSalaSessaoId(null);
    setDataSessao('');
    setHoraSessao('');
    setPrecoSessao('');
    await carregarSalas();
    setTela('cadastroSessao');
  }

  async function cadastrarSessao() {
    if (!filmeSessaoId) return avisar('Selecione um filme.');
    if (!salaSessaoId) return avisar('Selecione uma sala.');
    if (!dataSessao || !horaSessao || !precoSessao.trim()) {
      return avisar('Preencha a data, o horário e o preço.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataSessao)) {
      return avisar('Informe a data no formato AAAA-MM-DD.');
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaSessao)) {
      return avisar('Informe o horário no formato HH:MM.');
    }

    const [ano, mes, dia] = dataSessao.split('-').map(Number);
    const dataValidada = new Date(ano, mes - 1, dia);
    if (
      dataValidada.getFullYear() !== ano ||
      dataValidada.getMonth() !== mes - 1 ||
      dataValidada.getDate() !== dia
    ) {
      return avisar('A data informada não existe.');
    }

    const preco = Number(precoSessao.replace(',', '.'));
    if (!Number.isFinite(preco) || preco <= 0) return avisar('Informe um preço válido maior que zero.');

    const dataHora = new Date(`${dataSessao}T${horaSessao}:00`);
    if (Number.isNaN(dataHora.getTime())) return avisar('Data e horário inválidos.');
    if (dataHora <= new Date()) return avisar('A sessão precisa ter uma data e horário futuros.');

    try {
      setCadastrandoSessao(true);
      const resposta = await fetch(`${API}/sessoes`, {
        method: 'POST',
        headers: headersAutenticados(true),
        body: JSON.stringify({
          filmeId: filmeSessaoId,
          salaId: salaSessaoId,
          dataHora: dataHora.toISOString(),
          preco,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível cadastrar a sessão.');
      avisar('Sessão cadastrada com sucesso!');
      setFilmeSessaoId(null);
      setSalaSessaoId(null);
      setDataSessao('');
      setHoraSessao('');
      setPrecoSessao('');
      setTela('operador');
    } catch (error) {
      avisar(error instanceof Error ? error.message : 'Erro ao cadastrar sessão.');
    } finally {
      setCadastrandoSessao(false);
    }
  }

  async function carregarRelatorio() {
    if (!token || !usuario || (usuario.perfil !== 'OPERADOR' && usuario.perfil !== 'ADMINISTRADOR')) {
      avisar('Apenas operadores e administradores podem consultar os relatórios.');
      setTela('login');
      return;
    }
    try {
      setTela('relatorios');
      setCarregandoRelatorio(true);
      setErroRelatorio('');
      setRelatorio(null);
      const resposta = await fetch(`${API}/relatorios`, { headers: headersAutenticados() });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível carregar o relatório.');
      setRelatorio(dados);
    } catch (error) {
      setErroRelatorio(error instanceof Error ? error.message : 'Erro ao carregar relatório.');
    } finally {
      setCarregandoRelatorio(false);
    }
  }

  function campo(
    valor: string,
    alterar: (texto: string) => void,
    placeholder: string,
    multiline = false,
    teclado: 'default' | 'numeric' = 'default'
  ) {
    return (
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={valor}
        onChangeText={alterar}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        multiline={multiline}
        keyboardType={teclado}
      />
    );
  }

  useEffect(() => {
    carregarFilmes();
    restaurarSessao();
  }, []);

  const operadorAutorizado =
    !!usuario && (usuario.perfil === 'OPERADOR' || usuario.perfil === 'ADMINISTRADOR');

  const assentosPorFileira = assentos.reduce<Record<string, Assento[]>>(
    (grupos, assento) => {
      if (!grupos[assento.fileira]) {
        grupos[assento.fileira] = [];
      }

      grupos[assento.fileira].push(assento);
      return grupos;
    },
    {}
  );

  const fileirasOrdenadas = Object.keys(assentosPorFileira).sort();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setTela('inicio')}>
            <Text style={styles.logo}>CINE<Text style={styles.logoDestaque}>PASS</Text></Text>
          </TouchableOpacity>
          <Text style={styles.subtitulo}>SEU CINEMA, SUA EXPERIÊNCIA</Text>
          <View style={styles.headerConta}>
            {usuario ? (
              <>
                <Text style={styles.usuarioTexto}>
                  Olá, {usuario.nome} ({usuario.perfil})
                </Text>
                <TouchableOpacity onPress={sair}>
                  <Text style={styles.linkHeader}>SAIR</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => { setErroAutenticacao(''); setTela('login'); }}>
                <Text style={styles.linkHeader}>ENTRAR / CADASTRAR</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {tela === 'login' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Entrar na conta</Text>
            <Text style={styles.secaoDescricao}>Acesse sua conta CinePass.</Text>
            {campo(emailUsuario, setEmailUsuario, 'E-mail')}
            <TextInput
              style={styles.input}
              value={senhaUsuario}
              onChangeText={setSenhaUsuario}
              placeholder="Senha"
              placeholderTextColor="#64748b"
              secureTextEntry
              autoCapitalize="none"
            />
            {!!erroAutenticacao && <Text style={styles.erro}>{erroAutenticacao}</Text>}
            <TouchableOpacity
              style={[styles.botao, carregandoAutenticacao && styles.botaoDesativado]}
              onPress={fazerLogin}
              disabled={carregandoAutenticacao}
            >
              <Text style={styles.botaoTexto}>{carregandoAutenticacao ? 'ENTRANDO...' : 'ENTRAR'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setErroAutenticacao(''); setTela('cadastroUsuario'); }}>
              <Text style={styles.voltar}>CRIAR UMA CONTA</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'cadastroUsuario' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Criar conta</Text>
            <Text style={styles.secaoDescricao}>Cadastre-se para reservar seus assentos.</Text>
            {campo(nomeUsuario, setNomeUsuario, 'Nome completo')}
            {campo(emailUsuario, setEmailUsuario, 'E-mail')}
            <TextInput
              style={styles.input}
              value={senhaUsuario}
              onChangeText={setSenhaUsuario}
              placeholder="Senha (mínimo 8 caracteres)"
              placeholderTextColor="#64748b"
              secureTextEntry
              autoCapitalize="none"
            />
            {!!erroAutenticacao && <Text style={styles.erro}>{erroAutenticacao}</Text>}
            <TouchableOpacity
              style={[styles.botao, carregandoAutenticacao && styles.botaoDesativado]}
              onPress={cadastrarUsuario}
              disabled={carregandoAutenticacao}
            >
              <Text style={styles.botaoTexto}>{carregandoAutenticacao ? 'CADASTRANDO...' : 'CRIAR CONTA'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setErroAutenticacao(''); setTela('login'); }}>
              <Text style={styles.voltar}>JÁ TENHO UMA CONTA</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'inicio' && (
          <>
            <View style={styles.banner}>
              <Text style={styles.bannerPequeno}>BEM-VINDO AO CINEPASS</Text>
              <Text style={styles.bannerTitulo}>O próximo filme{"\n"}da sua história.</Text>
              <Text style={styles.bannerDescricao}>Confira os filmes em cartaz e garanta seu ingresso.</Text>
              <TouchableOpacity style={styles.botao} onPress={() => setTela('filmes')}>
                <Text style={styles.botaoTexto}>EXPLORAR FILMES</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secao}>
              <Text style={styles.secaoTitulo}>Em cartaz</Text>
              <Text style={styles.secaoDescricao}>Escolha seu próximo filme</Text>
              {carregando && <Text style={styles.mensagem}>Carregando filmes...</Text>}
              {!!erro && <Text style={styles.erro}>{erro}</Text>}
              {filmes.map((filme) => (
                <View style={styles.filmeCard} key={filme.id}>
                  <Image
                    source={{ uri: filme.imagem?.startsWith('http') ? filme.imagem : 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' }}
                    style={styles.poster}
                  />
                  <View style={styles.filmeInfo}>
                    <Text style={styles.filmeTitulo}>{filme.titulo}</Text>
                    <Text style={styles.filmeGenero}>{filme.genero}</Text>
                    <Text style={styles.filmeDetalhes}>{filme.classificacao} • {filme.duracao} min</Text>
                    <TouchableOpacity style={styles.botaoIngresso} onPress={() => carregarSessoes(filme)}>
                      <Text style={styles.botaoIngressoTexto}>VER SESSÕES</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {usuario?.perfil === 'CLIENTE' && (
              <TouchableOpacity style={styles.botaoOperador} onPress={carregarMeusIngressos}>
                <Text style={styles.botaoOperadorTexto}>MEUS INGRESSOS</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.botaoOperador} onPress={abrirPainelOperador}>
              <Text style={styles.botaoOperadorTexto}>ÁREA DO OPERADOR</Text>
            </TouchableOpacity>
          </>
        )}

        {tela === 'filmes' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Gerenciar filmes</Text>
            <Text style={styles.secaoDescricao}>Lista completa de filmes cadastrados</Text>
            {filmes.map((filme) => (
              <View style={styles.filmeCard} key={filme.id}>
                <Image
                  source={{ uri: filme.imagem?.startsWith('http') ? filme.imagem : 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' }}
                  style={styles.poster}
                />
                <View style={styles.filmeInfo}>
                  <Text style={styles.filmeTitulo}>{filme.titulo}</Text>
                  <Text style={styles.filmeGenero}>{filme.genero}</Text>
                  <Text style={styles.filmeDetalhes}>{filme.classificacao} • {filme.duracao} min</Text>
                  {operadorAutorizado && (
                    <>
                      <TouchableOpacity
                        style={styles.botaoSecundario}
                        onPress={() => abrirEdicaoFilme(filme)}
                      >
                        <Text style={styles.botaoSecundarioTexto}>EDITAR FILME</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.botaoSecundario, { backgroundColor: '#7f1d1d' }]}
                        onPress={() => excluirFilme(filme.id)}
                      >
                        <Text style={styles.botaoSecundarioTexto}>EXCLUIR FILME</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'filmesBalcao' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Venda no balcão</Text>
            <Text style={styles.secaoDescricao}>Selecione o filme para consultar as sessões disponíveis</Text>
            {filmes.map((filme) => (
              <View style={styles.filmeCard} key={filme.id}>
                <Image
                  source={{ uri: filme.imagem?.startsWith('http') ? filme.imagem : 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' }}
                  style={styles.poster}
                />
                <View style={styles.filmeInfo}>
                  <Text style={styles.filmeTitulo}>{filme.titulo}</Text>
                  <Text style={styles.filmeGenero}>{filme.genero}</Text>
                  <Text style={styles.filmeDetalhes}>{filme.classificacao} • {filme.duracao} min</Text>
                  <TouchableOpacity style={styles.botaoIngresso} onPress={() => carregarSessoes(filme)}>
                    <Text style={styles.botaoIngressoTexto}>SELECIONAR FILME</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => { setModoBalcao(false); setTela('operador'); }}>
              <Text style={styles.voltar}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'cadastro' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>
              {filmeEditandoId !== null ? 'Editar filme' : 'Cadastrar filme'}
            </Text>
            <Text style={styles.secaoDescricao}>Preencha as informações do filme</Text>
            {campo(titulo, setTitulo, 'Título do filme')}
            {campo(descricao, setDescricao, 'Descrição / Sinopse', true)}
            {campo(duracao, setDuracao, 'Duração (em minutos)', false, 'numeric')}
            {campo(classificacao, setClassificacao, 'Classificação (ex: Livre, 14 anos)')}
            {campo(genero, setGenero, 'Gênero (ex: Ação, Drama)')}
            {campo(imagem, setImagem, 'URL da imagem do pôster')}
            <TouchableOpacity style={styles.botao} onPress={cadastrarFilme}>
              <Text style={styles.botaoTexto}>
                {filmeEditandoId !== null ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR FILME'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setFilmeEditandoId(null); setTela('operador'); }}>
              <Text style={styles.voltar}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'cadastroSala' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Cadastrar nova sala</Text>
            <Text style={styles.secaoDescricao}>Defina o nome e a estrutura de assentos da sala</Text>
            {campo(nomeSala, setNomeSala, 'Nome da sala (ex: Sala 1 VIP)')}
            {campo(fileirasSala, setFileirasSala, 'Quantidade de fileiras (1 a 26)', false, 'numeric')}
            {campo(assentosPorFileiraSala, setAssentosPorFileiraSala, 'Assentos por fileira', false, 'numeric')}
            <TouchableOpacity
              style={[styles.botao, cadastrandoSala && styles.botaoDesativado]}
              onPress={cadastrarSala}
              disabled={cadastrandoSala}
            >
              <Text style={styles.botaoTexto}>{cadastrandoSala ? 'CADASTRANDO...' : 'CADASTRAR SALA'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTela('operador')}>
              <Text style={styles.voltar}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'operador' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Painel do Operador</Text>
            <Text style={styles.secaoDescricao}>Gerencie filmes, salas, sessões e ingressos</Text>
            <TouchableOpacity
              style={styles.botaoPainel}
              onPress={() => {
                setModoBalcao(true);
                setFilmeSelecionado(null);
                setTela('filmesBalcao');
              }}
            >
              <Text style={styles.botaoPainelTexto}>VENDA NO BALCÃO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botaoPainel}
              onPress={() => {
                setFilmeEditandoId(null);
                setTitulo('');
                setDescricao('');
                setDuracao('');
                setClassificacao('');
                setGenero('');
                setImagem('');
                setTela('cadastro');
              }}
            >
              <Text style={styles.botaoPainelTexto}>+ CADASTRAR NOVO FILME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoPainel} onPress={() => setTela('cadastroSala')}>
              <Text style={styles.botaoPainelTexto}>+ CADASTRAR NOVA SALA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoPainel} onPress={abrirCadastroSessao}>
              <Text style={styles.botaoPainelTexto}>+ CADASTRAR NOVA SESSÃO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoPainel} onPress={carregarRelatorio}>
              <Text style={styles.botaoPainelTexto}>RELATÓRIO DE OCUPAÇÃO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoPainel} onPress={() => setTela('validarIngresso')}>
              <Text style={styles.botaoPainelTexto}>VALIDAR INGRESSO (QR / CÓDIGO)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'cadastroSessao' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Cadastrar Sessão</Text>
            <Text style={styles.secaoDescricao}>Selecione o filme, a sala, data e preço</Text>
            <Text style={styles.label}>Filme:</Text>
            <ScrollView horizontal style={styles.seletorHorizontal}>
              {filmes.map((filme) => (
                <TouchableOpacity
                  key={filme.id}
                  style={[
                    styles.chip,
                    filmeSessaoId === filme.id && styles.chipSelecionado,
                  ]}
                  onPress={() => setFilmeSessaoId(filme.id)}
                >
                  <Text style={styles.chipTexto}>{filme.titulo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Sala:</Text>
            {carregandoSalas ? (
              <Text style={styles.mensagem}>Carregando salas...</Text>
            ) : (
              <ScrollView horizontal style={styles.seletorHorizontal}>
                {salas.map((sala) => (
                  <TouchableOpacity
                    key={sala.id}
                    style={[
                      styles.chip,
                      salaSessaoId === sala.id && styles.chipSelecionado,
                    ]}
                    onPress={() => setSalaSessaoId(sala.id)}
                  >
                    <Text style={styles.chipTexto}>{sala.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {campo(dataSessao, setDataSessao, 'Data (AAAA-MM-DD)')}
            {campo(horaSessao, setHoraSessao, 'Horário (HH:MM)')}
            {campo(precoSessao, setPrecoSessao, 'Preço (R$ ex: 25.00)', false, 'numeric')}
            <TouchableOpacity
              style={[styles.botao, cadastrandoSessao && styles.botaoDesativado]}
              onPress={cadastrarSessao}
              disabled={cadastrandoSessao}
            >
              <Text style={styles.botaoTexto}>{cadastrandoSessao ? 'CADASTRANDO...' : 'CADASTRAR SESSÃO'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTela('operador')}>
              <Text style={styles.voltar}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'sessoes' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>{modoBalcao ? 'Sessões para venda no balcão' : 'Sessões disponíveis'}</Text>
            <Text style={styles.secaoDescricao}>{filmeSelecionado?.titulo}</Text>
            {carregandoSessoes ? (
              <Text style={styles.mensagem}>Carregando sessões...</Text>
            ) : sessoes.length === 0 ? (
              <Text style={styles.mensagem}>Nenhuma sessão cadastrada para este filme.</Text>
            ) : (
              sessoes.map((sessao) => (
                <View style={styles.sessaoCard} key={sessao.id}>
                  <Text style={styles.sessaoData}>
                    {new Date(sessao.dataHora).toLocaleString('pt-BR')}
                  </Text>
                  <Text style={styles.sessaoSala}>{sessao.sala.nome}</Text>
                  <Text style={styles.sessaoPreco}>
                    R$ {Number(sessao.preco).toFixed(2).replace('.', ',')}
                  </Text>
                  <TouchableOpacity
                    style={styles.botaoIngresso}
                    onPress={() => carregarAssentos(sessao)}
                  >
                    <Text style={styles.botaoIngressoTexto}>SELECIONAR ASSENTOS</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'assentos' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>{modoBalcao ? 'Venda no balcão — Assentos' : 'Mapa de Assentos'}</Text>
            <Text style={styles.secaoDescricao}>
              {sessaoSelecionada?.filme.titulo} • {sessaoSelecionada?.sala.nome}
            </Text>
            <View style={styles.telaCinema}>
              <Text style={styles.telaCinemaTexto}>TELA DO CINEMA</Text>
            </View>

            <View style={styles.legendaAssentos}>
              <View style={styles.itemLegenda}>
                <View style={[styles.corLegenda, styles.assentoLivre]} />
                <Text style={styles.textoLegenda}>Livre</Text>
              </View>

              <View style={styles.itemLegenda}>
                <View style={[styles.corLegenda, styles.assentoReservado]} />
                <Text style={styles.textoLegenda}>Reservado</Text>
              </View>

              <View style={styles.itemLegenda}>
                <View style={[styles.corLegenda, styles.assentoVendido]} />
                <Text style={styles.textoLegenda}>Vendido</Text>
              </View>

              <View style={styles.itemLegenda}>
                <View style={[styles.corLegenda, styles.assentoSelecionado]} />
                <Text style={styles.textoLegenda}>Selecionado</Text>
              </View>
            </View>

            {carregandoAssentos ? (
              <Text style={styles.mensagem}>Carregando mapa de assentos...</Text>
            ) : (
              <View style={styles.mapaAssentos}>
                {fileirasOrdenadas.map((fileira) => (
                  <View key={fileira} style={styles.fileiraAssentos}>
                    {assentosPorFileira[fileira]
                      .sort((a, b) => a.numero - b.numero)
                      .map((assento) => {
                        const reservado = assento.status === 'RESERVADO';
                        const vendido = assento.status === 'VENDIDO';
                        const ocupado = reservado || vendido;
                        const selecionado = assentosSelecionados.includes(assento.id);

                        return (
                          <TouchableOpacity
                            key={assento.id}
                            style={[
                              styles.assento,
                              reservado && styles.assentoReservado,
                              vendido && styles.assentoVendido,
                              selecionado && styles.assentoSelecionado,
                            ]}
                            disabled={ocupado}
                            onPress={() => selecionarAssento(assento.id)}
                          >
                            <Text
                              style={[
                                styles.assentoTexto,
                                (ocupado || selecionado) && styles.assentoTextoDestaque,
                              ]}
                            >
                              {assento.codigo}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[styles.botao, reservando && styles.botaoDesativado]}
              onPress={modoBalcao ? venderNoBalcao : reservarAssentos}
              disabled={reservando || confirmandoCompra || assentosSelecionados.length === 0}
            >
              <Text style={styles.botaoTexto}>{reservando ? 'RESERVANDO...' : 'PROSSEGUIR PARA PAGAMENTO'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.voltarBotao}
              onPress={() => filmeSelecionado && carregarSessoes(filmeSelecionado)}
            >
              <Text style={styles.voltar}>VOLTAR ÀS SESSÕES</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'pagamento' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Confirmação e Pagamento</Text>
            <Text style={styles.secaoDescricao}>Reserva realizada temporariamente</Text>
            <Text style={styles.textoDestaque}>Assentos reservados: {reservaAssentos.join(', ')}</Text>
            <Text style={styles.sessaoPreco}>
              Total: R${' '}
              {(
                reservaAssentos.length * Number(sessaoSelecionada?.preco || 0)
              ).toFixed(2).replace('.', ',')}
            </Text>
            <TouchableOpacity
              style={[styles.botao, confirmandoCompra && styles.botaoDesativado]}
              onPress={confirmarCompra}
              disabled={confirmandoCompra}
            >
              <Text style={styles.botaoTexto}>{confirmandoCompra ? 'CONFIRMANDO...' : 'CONFIRMAR PAGAMENTO'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.voltarBotao}
              onPress={() => sessaoSelecionada && carregarAssentos(sessaoSelecionada)}
            >
              <Text style={styles.voltar}>CANCELAR E VOLTAR</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'meusIngressos' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Meus Ingressos</Text>
            <Text style={styles.secaoDescricao}>Histórico de ingressos adquiridos</Text>
            {carregandoIngressosCliente ? (
              <Text style={styles.mensagem}>Carregando ingressos...</Text>
            ) : ingressosCliente.length === 0 ? (
              <Text style={styles.mensagem}>Você ainda não possui ingressos comprados.</Text>
            ) : (
              ingressosCliente.map((item) => (
                <View style={styles.sessaoCard} key={item.id}>
                  <Text style={styles.filmeTitulo}>
                    {item.reservaAssento.reserva.sessao.filme.titulo}
                  </Text>
                  <Text style={styles.sessaoSala}>
                    Sala: {item.reservaAssento.reserva.sessao.sala.nome} | Assento: {item.reservaAssento.assento.codigo}
                  </Text>
                  <Text style={styles.sessaoData}>
                    Data/Hora: {new Date(item.reservaAssento.reserva.sessao.dataHora).toLocaleString('pt-BR')}
                  </Text>
                  <Text style={styles.textoDestaque}>Código: {item.codigo}</Text>
                  <Text style={[styles.sessaoPreco, { color: item.utilizadoEm ? '#ef4444' : '#22c55e' }]}>
                    Status: {item.utilizadoEm ? 'Já Utilizado' : 'Válido para entrada'}
                  </Text>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'relatorios' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Relatório de Ocupação</Text>
            <Text style={styles.secaoDescricao}>Métricas de ocupação e faturamento das sessões</Text>
            {carregandoRelatorio ? (
              <Text style={styles.mensagem}>Carregando relatórios...</Text>
            ) : erroRelatorio ? (
              <Text style={styles.erro}>{erroRelatorio}</Text>
            ) : relatorio ? (
              <>
                <View style={styles.cardResumo}>
                  <Text style={styles.textoResumo}>Total de Sessões: {relatorio.resumo.totalSessoes}</Text>
                  <Text style={styles.textoResumo}>Ingressos Vendidos: {relatorio.resumo.ingressosVendidos}</Text>
                  <Text style={styles.textoResumo}>
                    Ocupação Geral: {relatorio.resumo.ocupacaoGeral.toFixed(1)}%
                  </Text>
                  <Text style={styles.textoResumo}>
                    Faturamento Total: R$ {relatorio.resumo.faturamentoTotal.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                {relatorio.sessoes.map((s) => (
                  <View style={styles.sessaoCard} key={s.sessaoId}>
                    <Text style={styles.filmeTitulo}>{s.filme}</Text>
                    <Text style={styles.sessaoSala}>{s.sala} • {new Date(s.dataHora).toLocaleString('pt-BR')}</Text>
                    <Text style={styles.sessaoDetalhes}>
                      Vendas: {s.ingressosVendidos} / {s.capacidade} ({s.ocupacaoPercentual.toFixed(1)}%)
                    </Text>
                    <Text style={styles.sessaoPreco}>
                      Faturamento: R$ {s.faturamento.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}
            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('operador')}>
              <Text style={styles.voltar}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'validarIngresso' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Validar Ingresso</Text>
            <Text style={styles.secaoDescricao}>Insira o código do ingresso para consulta e portaria</Text>
            {campo(codigoIngresso, setCodigoIngresso, 'Código do ingresso (ex: ING-XXXXXX)')}
            <TouchableOpacity
              style={[styles.botao, consultandoIngresso && styles.botaoDesativado]}
              onPress={consultarIngresso}
              disabled={consultandoIngresso}
            >
              <Text style={styles.botaoTexto}>{consultandoIngresso ? 'CONSULTANDO...' : 'BUSCAR INGRESSO'}</Text>
            </TouchableOpacity>
            {ingressoConsultado && (
              <View style={styles.cardIngresso}>
                <Text style={styles.filmeTitulo}>
                  {ingressoConsultado.reservaAssento.reserva.sessao.filme.titulo}
                </Text>
                <Text style={styles.sessaoSala}>
                  Sala: {ingressoConsultado.reservaAssento.reserva.sessao.sala.nome} | Assento:{' '}
                  {ingressoConsultado.reservaAssento.assento.codigo}
                </Text>
                <Text style={styles.sessaoData}>
                  Data/Hora:{' '}
                  {new Date(
                    ingressoConsultado.reservaAssento.reserva.sessao.dataHora
                  ).toLocaleString('pt-BR')}
                </Text>
                <Text
                  style={[
                    styles.statusIngresso,
                    { color: ingressoConsultado.utilizadoEm ? '#ef4444' : '#22c55e' },
                  ]}
                >
                  {ingressoConsultado.utilizadoEm
                    ? `Já Utilizado em: ${new Date(ingressoConsultado.utilizadoEm).toLocaleString('pt-BR')}`
                    : 'Ingresso VÁLIDO'}
                </Text>
                {!ingressoConsultado.utilizadoEm && (
                  <TouchableOpacity
                    style={[styles.botao, validandoIngresso && styles.botaoDesativado, { marginTop: 12 }]}
                    onPress={validarIngresso}
                    disabled={validandoIngresso}
                  >
                    <Text style={styles.botaoTexto}>
                      {validandoIngresso ? 'VALIDANDO...' : 'CONFIRMAR ENTRADA'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('operador')}>
              <Text style={styles.voltar}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 16,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  logoDestaque: {
    color: '#e11d48',
  },
  subtitulo: {
    color: '#94a3b8',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 2,
  },
  headerConta: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usuarioTexto: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  linkHeader: {
    color: '#e11d48',
    fontWeight: 'bold',
    fontSize: 12,
  },
  banner: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#e11d48',
  },
  bannerPequeno: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  bannerTitulo: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  bannerDescricao: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 16,
  },
  secao: {
    marginBottom: 24,
  },
  secaoTitulo: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secaoDescricao: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 16,
  },
  filmeCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  poster: {
    width: 70,
    height: 100,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  filmeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  filmeTitulo: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filmeGenero: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  filmeDetalhes: {
    color: '#94a3b8',
    fontSize: 12,
    marginVertical: 4,
  },
  botaoIngresso: {
    backgroundColor: '#e11d48',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  botaoIngressoTexto: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  botaoSecundario: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  botaoSecundarioTexto: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  botao: {
    backgroundColor: '#e11d48',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoDesativado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  botaoPainel: {
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  botaoPainelTexto: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  botaoOperador: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  botaoOperadorTexto: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 6,
  },
  seletorHorizontal: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipSelecionado: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  chipTexto: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sessaoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#e11d48',
  },
  sessaoData: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sessaoSala: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  sessaoDetalhes: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 4,
  },
  sessaoPreco: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  telaCinema: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    marginVertical: 16,
  },
  telaCinemaTexto: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  mapaAssentos: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginVertical: 10,
  },
  fileiraAssentos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  assento: {
    width: 40,
    height: 40,
    backgroundColor: '#16a34a',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#15803d',
  },
  assentoLivre: {
    backgroundColor: '#16a34a',
    borderColor: '#15803d',
  },
  assentoReservado: {
    backgroundColor: '#eab308',
    borderColor: '#ca8a04',
  },
  assentoVendido: {
    backgroundColor: '#64748b',
    borderColor: '#475569',
  },
  assentoSelecionado: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  legendaAssentos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  itemLegenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  corLegenda: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  textoLegenda: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  assentoTexto: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: 'bold',
  },
  assentoTextoDestaque: {
    color: '#ffffff',
  },
  textoDestaque: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  cardResumo: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textoResumo: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardIngresso: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusIngresso: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  erro: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 10,
  },
  mensagem: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  voltarBotao: {
    marginTop: 16,
    alignItems: 'center',
  },
  voltar: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
});