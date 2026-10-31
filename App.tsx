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
    if (senhaUsuario.length < 6) {
      setErroAutenticacao('A senha deve possuir pelo menos 6 caracteres.');
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
              placeholder="Senha (mínimo 6 caracteres)"
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

        {tela === 'cadastro' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>
              {filmeEditandoId !== null ? 'Editar filme' : 'Cadastrar filme'}
            </Text>
            <Text style={styles.secaoDescricao}>
              {filmeEditandoId !== null
                ? 'Altere os dados do filme selecionado.'
                : 'Preencha os dados para adicionar um filme.'}
            </Text>
            {campo(titulo, setTitulo, 'Título do filme')}
            {campo(descricao, setDescricao, 'Descrição', true)}
            {campo(duracao, setDuracao, 'Duração (minutos)', false, 'numeric')}
            {campo(classificacao, setClassificacao, 'Classificação (ex: 12 anos)')}
            {campo(genero, setGenero, 'Gênero')}
            {campo(imagem, setImagem, 'URL da Imagem (Poster)')}
            <TouchableOpacity style={styles.botao} onPress={cadastrarFilme}>
              <Text style={styles.botaoTexto}>
                {filmeEditandoId !== null ? 'ATUALIZAR FILME' : 'SALVAR FILME'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTela('operador')}>
              <Text style={styles.voltar}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'sessoes' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Sessões disponíveis</Text>
            <Text style={styles.secaoDescricao}>
              {filmeSelecionado ? filmeSelecionado.titulo : 'Escolha uma sessão'}
            </Text>
            {carregandoSessoes && <Text style={styles.mensagem}>Carregando sessões...</Text>}
            {!carregandoSessoes && sessoes.length === 0 && (
              <Text style={styles.mensagem}>Nenhuma sessão encontrada para este filme.</Text>
            )}
            {sessoes.map((sessao) => {
              const dataFormatada = new Date(sessao.dataHora).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              });
              const precoFormatado = Number(sessao.preco).toFixed(2).replace('.', ',');
              return (
                <View style={styles.sessaoCard} key={sessao.id}>
                  <View>
                    <Text style={styles.sessaoSala}>{sessao.sala.nome}</Text>
                    <Text style={styles.sessaoData}>{dataFormatada}</Text>
                    <Text style={styles.sessaoPreco}>R$ {precoFormatado}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.botaoIngresso}
                    onPress={() => carregarAssentos(sessao)}
                  >
                    <Text style={styles.botaoIngressoTexto}>ESCOLHER ASSENTOS</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AOS FILMES</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'assentos' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Escolha seus assentos</Text>
            <Text style={styles.secaoDescricao}>
              {sessaoSelecionada
                ? `${sessaoSelecionada.filme.titulo} - ${sessaoSelecionada.sala.nome}`
                : 'Selecione os assentos desejados'}
            </Text>
            {carregandoAssentos && <Text style={styles.mensagem}>Carregando assentos...</Text>}
            <View style={styles.telaCinemaContainer}>
              <View style={styles.telaCinemaBarra} />
              <Text style={styles.telaCinemaTexto}>TELA</Text>
            </View>
            <View style={styles.assentosGrid}>
              {assentos.map((assento) => {
                const ocupado = ['OCUPADO', 'RESERVADO', 'VENDIDO'].includes(assento.status);
                const selecionado = assentosSelecionados.includes(assento.id);
                return (
                  <TouchableOpacity
                    key={assento.id}
                    style={[
                      styles.assentoBotao,
                      ocupado && styles.assentoOcupado,
                      selecionado && styles.assentoSelecionado,
                    ]}
                    onPress={() => !ocupado && selecionarAssento(assento.id)}
                    disabled={ocupado}
                  >
                    <Text style={styles.assentoTexto}>
                      {assento.codigo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.legendaContainer}>
              <View style={styles.legendaItem}>
                <View style={[styles.assentoBotao, { width: 20, height: 20 }]} />
                <Text style={styles.legendaTexto}>Disponível</Text>
              </View>
              <View style={styles.legendaItem}>
                <View
                  style={[
                    styles.assentoBotao,
                    styles.assentoSelecionado,
                    { width: 20, height: 20 },
                  ]}
                />
                <Text style={styles.legendaTexto}>Selecionado</Text>
              </View>
              <View style={styles.legendaItem}>
                <View
                  style={[styles.assentoBotao, styles.assentoOcupado, { width: 20, height: 20 }]}
                />
                <Text style={styles.legendaTexto}>Ocupado</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.botao, reservando && styles.botaoDesativado]}
              onPress={reservarAssentos}
              disabled={reservando}
            >
              <Text style={styles.botaoTexto}>
                {reservando ? 'RESERVANDO...' : 'AVANÇAR PARA PAGAMENTO'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.voltarBotao}
              onPress={() => {
                if (sessaoSelecionada) carregarSessoes(sessaoSelecionada.filme);
              }}
            >
              <Text style={styles.voltar}>VOLTAR ÀS SESSÕES</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'pagamento' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Pagamento da Reserva</Text>
            <Text style={styles.secaoDescricao}>Confirme os dados para finalizar sua compra.</Text>
            {sessaoSelecionada && (
              <View style={styles.resumoContainer}>
                <Text style={styles.resumoTitulo}>{sessaoSelecionada.filme.titulo}</Text>
                <Text style={styles.resumoTexto}>Sala: {sessaoSelecionada.sala.nome}</Text>
                <Text style={styles.resumoTexto}>
                  Assentos: {reservaAssentos.join(', ')}
                </Text>
                <Text style={styles.resumoTexto}>
                  Total: R${' '}
                  {(
                    reservaAssentos.length * Number(sessaoSelecionada.preco)
                  ).toFixed(2).replace('.', ',')}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.botao, confirmandoCompra && styles.botaoDesativado]}
              onPress={confirmarCompra}
              disabled={confirmandoCompra}
            >
              <Text style={styles.botaoTexto}>
                {confirmandoCompra ? 'PROCESSANDO...' : 'CONFIRMAR COMPRA'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>CANCELAR / VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'meusIngressos' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Meus Ingressos</Text>
            <Text style={styles.secaoDescricao}>Histórico de ingressos adquiridos.</Text>

            {carregandoIngressosCliente && <Text style={styles.mensagem}>Carregando ingressos...</Text>}

            {!carregandoIngressosCliente && ingressosCliente.length === 0 && (
              <Text style={styles.mensagem}>Você ainda não possui ingressos cadastrados.</Text>
            )}

            {ingressosCliente.map((ing) => {
              const sessaoInfo = ing.reservaAssento?.reserva?.sessao;
              const dataFormatada = sessaoInfo?.dataHora
                ? new Date(sessaoInfo.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                : 'Data não informada';

              return (
                <View style={styles.resumoContainer} key={ing.id}>
                  <Text style={styles.resumoTitulo}>{sessaoInfo?.filme?.titulo || 'Filme'}</Text>
                  <Text style={styles.resumoTexto}>Sala: {sessaoInfo?.sala?.nome || 'Sala'}</Text>
                  <Text style={styles.resumoTexto}>Data/Hora: {dataFormatada}</Text>
                  <Text style={styles.resumoTexto}>Assento: {ing.reservaAssento?.assento?.codigo || 'N/A'}</Text>
                  <Text style={styles.resumoTexto}>Código: {ing.codigo}</Text>
                  <Text style={styles.resumoTexto}>
                    Status: {ing.utilizadoEm ? 'UTILIZADO' : 'VÁLIDO'}
                  </Text>
                </View>
              );
            })}

            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'operador' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Painel do Operador</Text>
            <Text style={styles.secaoDescricao}>Gerencie filmes, sessões e valide ingressos.</Text>
            <TouchableOpacity
              style={styles.botao}
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
              <Text style={styles.botaoTexto}>CADASTRAR NOVO FILME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botao} onPress={abrirCadastroSessao}>
              <Text style={styles.botaoTexto}>CADASTRAR NOVA SESSÃO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botao} onPress={() => setTela('filmes')}>
              <Text style={styles.botaoTexto}>GERENCIAR FILMES</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botao} onPress={carregarRelatorio}>
              <Text style={styles.botaoTexto}>CONSULTAR RELATÓRIOS</Text>
            </TouchableOpacity>

            <View style={styles.divisor} />

            <Text style={styles.secaoSubtitulo}>Validação de Ingressos</Text>
            {campo(codigoIngresso, setCodigoIngresso, 'Código do ingresso')}
            <TouchableOpacity
              style={[styles.botao, consultandoIngresso && styles.botaoDesativado]}
              onPress={consultarIngresso}
              disabled={consultandoIngresso}
            >
              <Text style={styles.botaoTexto}>
                {consultandoIngresso ? 'CONSULTANDO...' : 'CONSULTAR INGRESSO'}
              </Text>
            </TouchableOpacity>

            {ingressoConsultado && (
              <View style={styles.resumoContainer}>
                <Text style={styles.resumoTitulo}>Ingresso Encontrado</Text>
                <Text style={styles.resumoTexto}>Código: {ingressoConsultado.codigo}</Text>
                <Text style={styles.resumoTexto}>
                  Filme: {ingressoConsultado.reservaAssento.reserva.sessao.filme.titulo}
                </Text>
                <Text style={styles.resumoTexto}>
                  Sala: {ingressoConsultado.reservaAssento.reserva.sessao.sala.nome}
                </Text>
                <Text style={styles.resumoTexto}>
                  Assento: {ingressoConsultado.reservaAssento.assento.codigo}
                </Text>
                <Text style={styles.resumoTexto}>
                  Status:{' '}
                  {ingressoConsultado.utilizadoEm ? 'UTILIZADO' : 'VÁLIDO PARA ENTRADA'}
                </Text>

                {!ingressoConsultado.utilizadoEm && (
                  <TouchableOpacity
                    style={[styles.botao, validandoIngresso && styles.botaoDesativado]}
                    onPress={validarIngresso}
                    disabled={validandoIngresso}
                  >
                    <Text style={styles.botaoTexto}>
                      {validandoIngresso ? 'VALIDANDO...' : 'VALIDAR ENTRADA'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'cadastroSessao' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Cadastrar nova sessão</Text>
            <Text style={styles.secaoDescricao}>Selecione o filme, a sala e defina horário e preço.</Text>

            <Text style={styles.labelCampo}>Selecione o filme:</Text>
            {filmes.map((filme) => (
              <TouchableOpacity
                key={filme.id}
                style={[
                  styles.opcaoSelecao,
                  filmeSessaoId === filme.id && styles.opcaoSelecionada,
                ]}
                onPress={() => setFilmeSessaoId(filme.id)}
              >
                <Text
                  style={[
                    styles.opcaoTexto,
                    filmeSessaoId === filme.id && styles.opcaoTextoSelecionado,
                  ]}
                >
                  {filme.titulo}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.labelCampo}>Selecione a sala:</Text>
            {carregandoSalas && <Text style={styles.mensagem}>Carregando salas...</Text>}
            {salas.map((sala) => (
              <TouchableOpacity
                key={sala.id}
                style={[
                  styles.opcaoSelecao,
                  salaSessaoId === sala.id && styles.opcaoSelecionada,
                ]}
                onPress={() => setSalaSessaoId(sala.id)}
              >
                <Text
                  style={[
                    styles.opcaoTexto,
                    salaSessaoId === sala.id && styles.opcaoTextoSelecionado,
                  ]}
                >
                  {sala.nome}
                </Text>
              </TouchableOpacity>
            ))}

            {campo(dataSessao, setDataSessao, 'Data (AAAA-MM-DD)')}
            {campo(horaSessao, setHoraSessao, 'Horário (HH:MM)')}
            {campo(precoSessao, setPrecoSessao, 'Preço do ingresso (ex: 25.00)', false, 'numeric')}

            <TouchableOpacity
              style={[styles.botao, cadastrandoSessao && styles.botaoDesativado]}
              onPress={cadastrarSessao}
              disabled={cadastrandoSessao}
            >
              <Text style={styles.botaoTexto}>
                {cadastrandoSessao ? 'CADASTRANDO...' : 'CADASTRAR SESSÃO'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.voltarBotao} onPress={() => setTela('operador')}>
              <Text style={styles.voltar}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'relatorios' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Relatórios de Ocupação</Text>
            <Text style={styles.secaoDescricao}>Visão geral de faturamento e vendas por sessão.</Text>

            {carregandoRelatorio && <Text style={styles.mensagem}>Carregando relatório...</Text>}
            {!!erroRelatorio && <Text style={styles.erro}>{erroRelatorio}</Text>}

            {relatorio && (
              <>
                <View style={styles.resumoContainer}>
                  <Text style={styles.resumoTitulo}>Resumo Geral</Text>
                  <Text style={styles.resumoTexto}>Total de Sessões: {relatorio.resumo.totalSessoes}</Text>
                  <Text style={styles.resumoTexto}>Ingressos Vendidos: {relatorio.resumo.ingressosVendidos}</Text>
                  <Text style={styles.resumoTexto}>Capacidade Total: {relatorio.resumo.capacidadeTotal}</Text>
                  <Text style={styles.resumoTexto}>
                    Faturamento Total: R$ {Number(relatorio.resumo.faturamentoTotal).toFixed(2).replace('.', ',')}
                  </Text>
                  <Text style={styles.resumoTexto}>
                    Ocupação Geral: {Number(relatorio.resumo.ocupacaoGeral).toFixed(1)}%
                  </Text>
                </View>

                <Text style={styles.secaoSubtitulo}>Sessões</Text>
                {relatorio.sessoes.map((s) => (
                  <View style={styles.resumoContainer} key={s.sessaoId}>
                    <Text style={styles.resumoTitulo}>{s.filme}</Text>
                    <Text style={styles.resumoTexto}>Sala: {s.sala}</Text>
                    <Text style={styles.resumoTexto}>Data/Hora: {new Date(s.dataHora).toLocaleString('pt-BR')}</Text>
                    <Text style={styles.resumoTexto}>Ingressos Vendidos: {s.ingressosVendidos} / {s.capacidade}</Text>
                    <Text style={styles.resumoTexto}>Ocupação: {Number(s.ocupacaoPercentual).toFixed(1)}%</Text>
                    <Text style={styles.resumoTexto}>
                      Faturamento: R$ {Number(s.faturamento).toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                ))}
              </>
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
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  logo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 2,
  },
  logoDestaque: {
    color: '#e11d48',
  },
  subtitulo: {
    fontSize: 10,
    color: '#64748b',
    letterSpacing: 3,
    marginTop: 4,
  },
  headerConta: {
    marginTop: 12,
    alignItems: 'center',
  },
  usuarioTexto: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  linkHeader: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  banner: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  bannerPequeno: {
    fontSize: 10,
    color: '#e11d48',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  bannerTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
    lineHeight: 32,
  },
  bannerDescricao: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  secao: {
    marginBottom: 32,
  },
  secaoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  secaoDescricao: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  secaoSubtitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 16,
    marginBottom: 12,
  },
  filmeCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  poster: {
    width: 100,
    height: 150,
  },
  filmeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  filmeTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  filmeGenero: {
    fontSize: 12,
    color: '#e11d48',
    marginBottom: 4,
    fontWeight: '600',
  },
  filmeDetalhes: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  botaoIngresso: {
    backgroundColor: '#e11d48',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoIngressoTexto: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  botaoSecundario: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  botaoSecundarioTexto: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  botao: {
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  botaoDesativado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  botaoOperador: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  botaoOperadorTexto: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  erro: {
    color: '#f43f5e',
    fontSize: 12,
    marginBottom: 12,
  },
  mensagem: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
  voltar: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: 'bold',
  },
  voltarBotao: {
    marginTop: 8,
    alignItems: 'center',
  },
  sessaoCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sessaoSala: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  sessaoData: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  sessaoPreco: {
    fontSize: 14,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  telaCinemaContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  telaCinemaBarra: {
    width: '80%',
    height: 4,
    backgroundColor: '#38bdf8',
    borderRadius: 2,
    marginBottom: 4,
  },
  telaCinemaTexto: {
    fontSize: 10,
    color: '#64748b',
    letterSpacing: 2,
  },
  assentosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  legendaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendaTexto: {
    fontSize: 12,
    color: '#94a3b8',
  },
  resumoContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resumoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  resumoTexto: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  labelCampo: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: '600',
  },
  opcaoSelecao: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  opcaoSelecionada: {
    borderColor: '#e11d48',
    backgroundColor: '#2d1b24',
  },
  opcaoTexto: {
    fontSize: 14,
    color: '#94a3b8',
  },
  opcaoTextoSelecionado: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  divisor: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 24,
  },
  assentoBotao: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  assentoOcupado: {
    backgroundColor: '#475569',
    borderColor: '#64748b',
    opacity: 0.65,
  },
  assentoSelecionado: {
    backgroundColor: '#e11d48',
    borderColor: '#fb7185',
  },
  assentoTexto: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  }
});
