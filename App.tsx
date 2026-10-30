import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';

type Filme = {
  id: number;
  titulo: string;
  descricao: string;
  duracao: number;
  classificacao: string;
  genero: string;
  imagem: string;
};

type Sessao = {
  id: number;
  filmeId: number;
  salaId: number;
  dataHora: string;
  preco: string | number;
  filme: Filme;
  sala: {
    id: number;
    nome: string;
  };
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
    assento: {
      codigo: string;
    };
    reserva: {
      sessao: {
        dataHora: string;
        filme: {
          titulo: string;
        };
        sala: {
          nome: string;
        };
      };
    };
  };
};

export default function App() {
  const [filmes, setFilmes] = useState<Filme[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tela, setTela] = useState('inicio');

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

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState('');
  const [classificacao, setClassificacao] = useState('');
  const [genero, setGenero] = useState('');
  const [imagem, setImagem] = useState('');

  async function carregarFilmes() {
    try {
      setErro('');

      const resposta = await fetch('http://localhost:3333/filmes');

      if (!resposta.ok) {
        throw new Error('Erro ao buscar filmes.');
      }

      const dados = await resposta.json();
      setFilmes(dados);
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

      const resposta = await fetch(
        `http://localhost:3333/sessoes/filme/${filme.id}`
      );

      if (!resposta.ok) {
        throw new Error('Erro ao buscar sessões.');
      }

      const dados = await resposta.json();

      setSessoes(dados);
      setTela('sessoes');
    } catch {
      alert('Não foi possível carregar as sessões.');
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

      const resposta = await fetch(
        `http://localhost:3333/sessoes/${sessao.id}/assentos`
      );

      if (!resposta.ok) {
        throw new Error('Erro ao buscar assentos.');
      }

      const dados = await resposta.json();

      setAssentos(dados.assentos);
      setTela('assentos');
    } catch {
      alert('Não foi possível carregar os assentos.');
    } finally {
      setCarregandoAssentos(false);
    }
  }

  function selecionarAssento(id: number) {
    setAssentosSelecionados((selecionados) =>
      selecionados.includes(id)
        ? selecionados.filter((assentoId) => assentoId !== id)
        : [...selecionados, id]
    );
  }

  async function reservarAssentos() {
    if (!sessaoSelecionada || assentosSelecionados.length === 0) {
      alert('Selecione pelo menos um assento.');
      return;
    }

    if (reservando) return;

    try {
      setReservando(true);

      const resposta = await fetch('http://localhost:3333/reservas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessaoId: sessaoSelecionada.id,
          assentosIds: assentosSelecionados,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível realizar a reserva.'
        );
      }

      const codigosAssentos = dados.reserva.assentos.map(
        (item: { assento: { codigo: string } }) => item.assento.codigo
      );

      setReservaId(dados.reserva.id);
      setReservaAssentos(codigosAssentos);

      const atualizacao = await fetch(
        `http://localhost:3333/sessoes/${sessaoSelecionada.id}/assentos`
      );

      if (atualizacao.ok) {
        const dadosAssentos = await atualizacao.json();
        setAssentos(dadosAssentos.assentos);
      }

      setAssentosSelecionados([]);
      setTela('pagamento');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao realizar reserva.'
      );

      if (sessaoSelecionada) {
        await carregarAssentos(sessaoSelecionada);
      }
    } finally {
      setReservando(false);
    }
  }

  async function confirmarCompra() {
    if (!reservaId || confirmandoCompra) return;

    try {
      setConfirmandoCompra(true);

      const resposta = await fetch(
        `http://localhost:3333/compras/${reservaId}/confirmar`,
        {
          method: 'POST',
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível confirmar a compra.'
        );
      }

      const codigosAssentos = dados.compra.assentos
        .map(
          (item: { assento: { codigo: string } }) =>
            item.assento.codigo
        )
        .join(', ');

      const codigosIngressos = dados.compra.assentos
        .map(
          (item: { ingresso?: { codigo: string } | null }) =>
            item.ingresso?.codigo || 'Não informado'
        )
        .join('\n');

      const total = (
        dados.compra.assentos.length *
        Number(dados.compra.sessao.preco)
      ).toFixed(2).replace('.', ',');

      setReservaId(null);
      setReservaAssentos([]);

      alert(
        `COMPRA CONFIRMADA!\n\n` +
        `Filme: ${dados.compra.sessao.filme.titulo}\n` +
        `Sala: ${dados.compra.sessao.sala.nome}\n` +
        `Assentos: ${codigosAssentos}\n` +
        `Total: R$ ${total}\n\n` +
        `CÓDIGOS DOS INGRESSOS:\n${codigosIngressos}\n\n` +
        `Aproveite o filme!`
      );

      if (sessaoSelecionada) {
        await carregarAssentos(sessaoSelecionada);
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao confirmar a compra.'
      );

      if (sessaoSelecionada) {
        await carregarAssentos(sessaoSelecionada);
      }
    } finally {
      setConfirmandoCompra(false);
    }
  }

  // CONSULTAR INGRESSO - FUNÇÃO ATUALIZADA
  async function consultarIngresso() {
    const codigo = codigoIngresso.trim().replace(/[\s"'`]/g, '');

    if (!codigo) {
      alert('Informe o código do ingresso.');
      return;
    }

    try {
      setConsultandoIngresso(true);
      setIngressoConsultado(null);

      const url = `http://localhost:3333/ingressos/${encodeURIComponent(codigo)}`;

      console.log('Consultando ingresso:', url);

      const resposta = await fetch(url);
      const texto = await resposta.text();

      console.log('Resposta da API:', resposta.status, texto);

      let dados;

      try {
        dados = JSON.parse(texto);
      } catch {
        throw new Error('A API retornou uma resposta inválida.');
      }

      if (!resposta.ok) {
        throw new Error(
          dados.erro ||
          dados.mensagem ||
          `Erro HTTP ${resposta.status}`
        );
      }

      if (!dados.codigo || !dados.reservaAssento) {
        throw new Error('A API retornou dados incompletos do ingresso.');
      }

      setIngressoConsultado(dados);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao consultar ingresso.'
      );
    } finally {
      setConsultandoIngresso(false);
    }
  }

  async function validarIngresso() {
    if (!ingressoConsultado || validandoIngresso) return;

    if (ingressoConsultado.utilizadoEm) {
      alert('Este ingresso já foi utilizado.');
      return;
    }

    try {
      setValidandoIngresso(true);

      const resposta = await fetch(
        `http://localhost:3333/ingressos/${encodeURIComponent(ingressoConsultado.codigo)}/validar`,
        {
          method: 'POST',
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível validar o ingresso.'
        );
      }

      setIngressoConsultado((atual) =>
        atual
          ? {
              ...atual,
              utilizadoEm: dados.ingresso.utilizadoEm,
            }
          : null
      );

      alert('Entrada validada com sucesso!');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao validar ingresso.'
      );
    } finally {
      setValidandoIngresso(false);
    }
  }

  useEffect(() => {
    carregarFilmes();
  }, []);

  async function cadastrarFilme() {
    if (!titulo || !descricao || !duracao || !classificacao || !genero) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!Number.isInteger(Number(duracao)) || Number(duracao) <= 0) {
      alert('Informe uma duração válida.');
      return;
    }

    try {
      const resposta = await fetch('http://localhost:3333/filmes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo,
          descricao,
          duracao: Number(duracao),
          classificacao,
          genero,
          imagem: imagem.trim(),
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao cadastrar filme.');
      }

      alert('Filme cadastrado com sucesso!');

      setTitulo('');
      setDescricao('');
      setDuracao('');
      setClassificacao('');
      setGenero('');
      setImagem('');

      await carregarFilmes();
      setTela('filmes');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao cadastrar filme.'
      );
    }
  }

  async function excluirFilme(id: number) {
    const confirmar = window.confirm(
      'Deseja realmente excluir este filme?'
    );

    if (!confirmar) return;

    try {
      const resposta = await fetch(`http://localhost:3333/filmes/${id}`, {
        method: 'DELETE',
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível excluir o filme.');
      }

      setFilmes((filmesAtuais) =>
        filmesAtuais.filter((filme) => filme.id !== id)
      );

      alert('Filme excluído com sucesso!');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao excluir filme.'
      );
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setTela('inicio')}>
            <Text style={styles.logo}>
              CINE<Text style={styles.logoDestaque}>PASS</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.subtitulo}>
            SEU CINEMA, SUA EXPERIÊNCIA
          </Text>
        </View>

        {tela === 'inicio' && (
          <>
            <View style={styles.banner}>
              <Text style={styles.bannerPequeno}>
                BEM-VINDO AO CINEPASS
              </Text>

              <Text style={styles.bannerTitulo}>
                O próximo filme{"\n"}da sua história.
              </Text>

              <Text style={styles.bannerDescricao}>
                Confira os filmes em cartaz e garanta seu ingresso.
              </Text>

              <TouchableOpacity
                style={styles.botao}
                onPress={() => setTela('filmes')}
              >
                <Text style={styles.botaoTexto}>EXPLORAR FILMES</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secao}>
              <Text style={styles.secaoTitulo}>Em cartaz</Text>

              <Text style={styles.secaoDescricao}>
                Escolha seu próximo filme
              </Text>

              {carregando && (
                <Text style={styles.mensagem}>Carregando filmes...</Text>
              )}

              {erro !== '' && (
                <Text style={styles.erro}>{erro}</Text>
              )}

              {filmes.map((filme) => (
                <View style={styles.filmeCard} key={filme.id}>
                  <Image
                    source={{
                      uri: filme.imagem?.startsWith('http')
                        ? filme.imagem
                        : 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
                    }}
                    style={styles.poster}
                  />

                  <View style={styles.filmeInfo}>
                    <Text style={styles.filmeTitulo}>{filme.titulo}</Text>
                    <Text style={styles.filmeGenero}>{filme.genero}</Text>

                    <Text style={styles.filmeDetalhes}>
                      {filme.classificacao} • {filme.duracao} min
                    </Text>

                    <TouchableOpacity
                      style={styles.botaoIngresso}
                      onPress={() => carregarSessoes(filme)}
                    >
                      <Text style={styles.botaoIngressoTexto}>
                        VER SESSÕES
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.botaoOperador}
              onPress={() => setTela('operador')}
            >
              <Text style={styles.botaoOperadorTexto}>
                ÁREA DO OPERADOR
              </Text>
            </TouchableOpacity>
          </>
        )}

        {tela === 'sessoes' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Sessões disponíveis</Text>

            <Text style={styles.secaoDescricao}>
              {filmeSelecionado?.titulo}
            </Text>

            {carregandoSessoes && (
              <Text style={styles.mensagem}>Carregando sessões...</Text>
            )}

            {!carregandoSessoes && sessoes.length === 0 && (
              <Text style={styles.mensagem}>
                Nenhuma sessão disponível para este filme.
              </Text>
            )}

            {sessoes.map((sessao) => (
              <View style={styles.sessaoCard} key={sessao.id}>
                <Text style={styles.filmeTitulo}>{sessao.sala.nome}</Text>

                <Text style={styles.filmeGenero}>
                  {new Date(sessao.dataHora).toLocaleDateString('pt-BR')}
                </Text>

                <Text style={styles.filmeDetalhes}>
                  Horário: {new Date(sessao.dataHora).toLocaleTimeString(
                    'pt-BR',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </Text>

                <Text style={styles.precoSessao}>
                  R$ {Number(sessao.preco).toFixed(2).replace('.', ',')}
                </Text>

                <TouchableOpacity
                  style={styles.botaoIngresso}
                  onPress={() => carregarAssentos(sessao)}
                >
                  <Text style={styles.botaoIngressoTexto}>
                    ESCOLHER ASSENTOS
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AOS FILMES</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'assentos' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Escolha seus assentos</Text>

            <Text style={styles.secaoDescricao}>
              {filmeSelecionado?.titulo} • {sessaoSelecionada?.sala.nome}
            </Text>

            {carregandoAssentos && (
              <Text style={styles.mensagem}>Carregando assentos...</Text>
            )}

            {!carregandoAssentos && (
              <>
                <View style={styles.telaCinema}>
                  <Text style={styles.telaCinemaTexto}>
                    TELA DO CINEMA
                  </Text>
                </View>

                <View style={styles.legendaAssentos}>
                  <Text style={styles.legendaTexto}>🟦 Livre</Text>
                  <Text style={styles.legendaTexto}>🟩 Selecionado</Text>
                  <Text style={styles.legendaTexto}>🟥 Reservado</Text>
                  <Text style={styles.legendaTexto}>⬛ Vendido</Text>
                </View>

                <View style={styles.gradeAssentos}>
                  {assentos.map((assento) => {
                    const selecionado = assentosSelecionados.includes(
                      assento.id
                    );

                    const reservado = assento.status === 'RESERVADO';
                    const vendido = assento.status === 'VENDIDO';

                    return (
                      <TouchableOpacity
                        key={assento.id}
                        style={[
                          styles.assento,
                          reservado && styles.assentoReservado,
                          vendido && styles.assentoVendido,
                          selecionado && styles.assentoSelecionado,
                        ]}
                        onPress={() => selecionarAssento(assento.id)}
                        disabled={assento.status !== 'LIVRE'}
                      >
                        <Text
                          style={[
                            styles.assentoTexto,
                            selecionado && styles.assentoTextoSelecionado,
                          ]}
                        >
                          {assento.codigo}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.resumoCompra}>
                  <Text style={styles.resumoTitulo}>
                    Resumo da seleção
                  </Text>

                  <Text style={styles.resumoTexto}>
                    Assentos: {assentosSelecionados.length > 0
                      ? assentos
                          .filter((assento) =>
                            assentosSelecionados.includes(assento.id)
                          )
                          .map((assento) => assento.codigo)
                          .join(', ')
                      : 'Nenhum selecionado'}
                  </Text>

                  <Text style={styles.precoSessao}>
                    Total: R$ {(
                      assentosSelecionados.length *
                      Number(sessaoSelecionada?.preco || 0)
                    ).toFixed(2).replace('.', ',')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.botao,
                    (assentosSelecionados.length === 0 || reservando) &&
                      styles.botaoDesativado,
                  ]}
                  disabled={
                    assentosSelecionados.length === 0 || reservando
                  }
                  onPress={reservarAssentos}
                >
                  <Text style={styles.botaoTexto}>
                    {reservando ? 'RESERVANDO...' : 'CONTINUAR'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={() => setTela('sessoes')}
              disabled={reservando}
            >
              <Text style={styles.voltar}>VOLTAR ÀS SESSÕES</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'pagamento' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Finalizar compra</Text>

            <Text style={styles.secaoDescricao}>
              Confira seus ingressos antes de confirmar.
            </Text>

            <View style={styles.resumoCompra}>
              <Text style={styles.resumoTitulo}>Resumo do pedido</Text>

              <Text style={styles.resumoTexto}>
                Filme: {filmeSelecionado?.titulo}
              </Text>

              <Text style={styles.resumoTexto}>
                Sala: {sessaoSelecionada?.sala.nome}
              </Text>

              <Text style={styles.resumoTexto}>
                Assentos: {reservaAssentos.join(', ')}
              </Text>

              <Text style={styles.precoSessao}>
                Total: R$ {(
                  reservaAssentos.length *
                  Number(sessaoSelecionada?.preco || 0)
                ).toFixed(2).replace('.', ',')}
              </Text>
            </View>

            <Text style={styles.mensagem}>
              Pagamento simulado para fins acadêmicos.
              Sua reserva tem validade de 10 minutos.
            </Text>

            <TouchableOpacity
              style={[
                styles.botao,
                confirmandoCompra && styles.botaoDesativado,
              ]}
              onPress={confirmarCompra}
              disabled={confirmandoCompra || !reservaId}
            >
              <Text style={styles.botaoTexto}>
                {confirmandoCompra
                  ? 'CONFIRMANDO...'
                  : 'CONFIRMAR COMPRA'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'operador' && (
          <View style={styles.secao}>
            <Text style={styles.bannerPequeno}>
              PAINEL ADMINISTRATIVO
            </Text>

            <Text style={styles.secaoTitulo}>Área do Operador</Text>

            <Text style={styles.secaoDescricao}>
              Gerencie os filmes e valide os ingressos do CinePass.
            </Text>

            <View style={styles.painelIngresso}>
              <Text style={styles.resumoTitulo}>Validar ingresso</Text>

              <Text style={styles.resumoTexto}>
                Informe o código do ingresso para consultar e liberar a entrada.
              </Text>

              <TextInput
                style={styles.input}
                value={codigoIngresso}
                onChangeText={(texto) => {
                  setCodigoIngresso(texto);
                  setIngressoConsultado(null);
                }}
                placeholder="Digite o código do ingresso"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[
                  styles.botao,
                  consultandoIngresso && styles.botaoDesativado,
                ]}
                onPress={consultarIngresso}
                disabled={consultandoIngresso}
              >
                <Text style={styles.botaoTexto}>
                  {consultandoIngresso
                    ? 'CONSULTANDO...'
                    : 'CONSULTAR INGRESSO'}
                </Text>
              </TouchableOpacity>

              {ingressoConsultado && (
                <View style={styles.resultadoIngresso}>
                  <Text style={styles.resultadoTitulo}>
                    Dados do ingresso
                  </Text>

                  <Text style={styles.resultadoTexto}>
                    Filme: {ingressoConsultado.reservaAssento.reserva.sessao.filme.titulo}
                  </Text>

                  <Text style={styles.resultadoTexto}>
                    Sala: {ingressoConsultado.reservaAssento.reserva.sessao.sala.nome}
                  </Text>

                  <Text style={styles.resultadoTexto}>
                    Data: {new Date(
                      ingressoConsultado.reservaAssento.reserva.sessao.dataHora
                    ).toLocaleDateString('pt-BR')}
                  </Text>

                  <Text style={styles.resultadoTexto}>
                    Assento: {ingressoConsultado.reservaAssento.assento.codigo}
                  </Text>

                  <Text style={styles.resultadoTexto}>
                    Código: {ingressoConsultado.codigo}
                  </Text>

                  <Text style={styles.resultadoTexto}>
                    Status do assento: {ingressoConsultado.reservaAssento.status}
                  </Text>

                  <View
                    style={[
                      styles.statusIngresso,
                      ingressoConsultado.utilizadoEm
                        ? styles.statusUtilizado
                        : styles.statusDisponivel,
                    ]}
                  >
                    <Text style={styles.statusIngressoTexto}>
                      {ingressoConsultado.utilizadoEm
                        ? 'INGRESSO JÁ UTILIZADO'
                        : 'INGRESSO DISPONÍVEL'}
                    </Text>
                  </View>

                  {ingressoConsultado.utilizadoEm && (
                    <Text style={styles.resultadoTexto}>
                      Utilizado em: {new Date(
                        ingressoConsultado.utilizadoEm
                      ).toLocaleString('pt-BR')}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.botao,
                      (validandoIngresso || !!ingressoConsultado.utilizadoEm) &&
                        styles.botaoDesativado,
                    ]}
                    onPress={validarIngresso}
                    disabled={
                      validandoIngresso ||
                      !!ingressoConsultado.utilizadoEm
                    }
                  >
                    <Text style={styles.botaoTexto}>
                      {ingressoConsultado.utilizadoEm
                        ? 'INGRESSO JÁ VALIDADO'
                        : validandoIngresso
                          ? 'VALIDANDO...'
                          : 'VALIDAR ENTRADA'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.botao}
              onPress={() => setTela('cadastro')}
            >
              <Text style={styles.botaoTexto}>+ CADASTRAR FILME</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botaoSecundario}
              onPress={() => {
                carregarFilmes();
                setTela('filmes');
              }}
            >
              <Text style={styles.botaoSecundarioTexto}>
                GERENCIAR FILMES
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTela('inicio')}>
              <Text style={styles.voltar}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'cadastro' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Cadastrar filme</Text>

            <Text style={styles.secaoDescricao}>
              Preencha os dados para adicionar um filme.
            </Text>

            {campo(titulo, setTitulo, 'Título do filme')}
            {campo(descricao, setDescricao, 'Descrição', true)}
            {campo(duracao, setDuracao, 'Duração em minutos', false, 'numeric')}
            {campo(classificacao, setClassificacao, 'Classificação indicativa')}
            {campo(genero, setGenero, 'Gênero')}
            {campo(imagem, setImagem, 'URL da imagem do filme')}

            <TouchableOpacity
              style={styles.botao}
              onPress={cadastrarFilme}
            >
              <Text style={styles.botaoTexto}>SALVAR FILME</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTela('operador')}>
              <Text style={styles.voltar}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        )}

        {tela === 'filmes' && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Gerenciar filmes</Text>

            <Text style={styles.secaoDescricao}>
              Filmes cadastrados no sistema.
            </Text>

            {filmes.length === 0 && (
              <Text style={styles.mensagem}>
                Nenhum filme cadastrado.
              </Text>
            )}

            {filmes.map((filme) => (
              <View style={styles.filmeCard} key={filme.id}>
                <Image
                  source={{
                    uri: filme.imagem?.startsWith('http')
                      ? filme.imagem
                      : 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
                  }}
                  style={styles.poster}
                />

                <View style={styles.filmeInfo}>
                  <Text style={styles.filmeTitulo}>{filme.titulo}</Text>
                  <Text style={styles.filmeGenero}>{filme.genero}</Text>

                  <Text style={styles.filmeDetalhes}>
                    {filme.duracao} minutos
                  </Text>

                  <TouchableOpacity
                    style={styles.botaoExcluir}
                    onPress={() => excluirFilme(filme.id)}
                  >
                    <Text style={styles.botaoExcluirTexto}>
                      EXCLUIR FILME
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.botao}
              onPress={() => setTela('operador')}
            >
              <Text style={styles.botaoTexto}>VOLTAR AO PAINEL</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.rodape}>
          <Text style={styles.logoRodape}>CINEPASS</Text>

          <Text style={styles.rodapeTexto}>
            Sua experiência começa aqui.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080d18',
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 25,
    paddingBottom: 25,
  },
  logo: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
  },
  logoDestaque: {
    color: '#06b6d4',
  },
  subtitulo: {
    color: '#64748b',
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 4,
  },
  banner: {
    marginHorizontal: 20,
    padding: 25,
    borderRadius: 18,
    backgroundColor: '#14243b',
    minHeight: 240,
    justifyContent: 'center',
  },
  bannerPequeno: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  bannerTitulo: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 15,
  },
  bannerDescricao: {
    color: '#a7b4c8',
    fontSize: 13,
    marginTop: 12,
    lineHeight: 20,
  },
  botao: {
    backgroundColor: '#06b6d4',
    padding: 14,
    borderRadius: 9,
    alignSelf: 'flex-start',
    marginTop: 20,
  },
  botaoTexto: {
    color: '#06111e',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  secao: {
    padding: 22,
    marginTop: 15,
  },
  secaoTitulo: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  secaoDescricao: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 18,
  },
  filmeCard: {
    flexDirection: 'row',
    backgroundColor: '#111c2e',
    borderRadius: 13,
    padding: 12,
    marginBottom: 15,
  },
  sessaoCard: {
    backgroundColor: '#111c2e',
    borderRadius: 13,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#263449',
  },
  poster: {
    width: 105,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#263449',
  },
  filmeInfo: {
    flex: 1,
    paddingLeft: 15,
    justifyContent: 'center',
  },
  filmeTitulo: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  filmeGenero: {
    color: '#06b6d4',
    fontSize: 12,
    marginTop: 7,
  },
  filmeDetalhes: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 7,
  },
  precoSessao: {
    color: '#06b6d4',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  botaoIngresso: {
    backgroundColor: '#06b6d4',
    borderRadius: 7,
    padding: 10,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  botaoIngressoTexto: {
    color: '#06111e',
    fontSize: 10,
    fontWeight: '900',
  },
  botaoOperador: {
    marginHorizontal: 22,
    marginTop: 10,
    marginBottom: 30,
    padding: 17,
    borderWidth: 1,
    borderColor: '#06b6d4',
    borderRadius: 9,
    alignItems: 'center',
  },
  botaoOperadorTexto: {
    color: '#06b6d4',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: '#06b6d4',
    borderRadius: 9,
    padding: 14,
    marginTop: 15,
    alignSelf: 'flex-start',
  },
  botaoSecundarioTexto: {
    color: '#06b6d4',
    fontWeight: 'bold',
    fontSize: 11,
  },
  input: {
    backgroundColor: '#111c2e',
    borderWidth: 1,
    borderColor: '#263449',
    borderRadius: 9,
    padding: 14,
    color: '#ffffff',
    marginBottom: 12,
  },
  inputMultiline: {
    height: 90,
    textAlignVertical: 'top',
  },
  botaoExcluir: {
    backgroundColor: '#991b1b',
    padding: 9,
    borderRadius: 7,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  botaoExcluirTexto: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mensagem: {
    color: '#ffffff',
    padding: 15,
  },
  erro: {
    color: '#ff6b6b',
    padding: 15,
  },
  voltar: {
    color: '#06b6d4',
    marginTop: 22,
    fontWeight: 'bold',
  },
  rodape: {
    alignItems: 'center',
    padding: 30,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  logoRodape: {
    color: '#06b6d4',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  rodapeTexto: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 8,
  },
  telaCinema: {
    backgroundColor: '#263449',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 15,
  },
  telaCinemaTexto: {
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  legendaAssentos: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  legendaTexto: {
    color: '#ffffff',
    fontSize: 12,
  },
  gradeAssentos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 5,
  },
  assento: {
    width: 38,
    height: 38,
    backgroundColor: '#06b6d4',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assentoSelecionado: {
    backgroundColor: '#16a34a',
  },
  assentoReservado: {
    backgroundColor: '#dc2626',
  },
  assentoVendido: {
    backgroundColor: '#64748b',
    opacity: 0.7,
  },
  assentoTexto: {
    color: '#06111e',
    fontSize: 10,
    fontWeight: 'bold',
  },
  assentoTextoSelecionado: {
    color: '#ffffff',
  },
  resumoCompra: {
    backgroundColor: '#111c2e',
    padding: 18,
    borderRadius: 12,
    marginTop: 25,
  },
  resumoTitulo: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resumoTexto: {
    color: '#94a3b8',
    marginTop: 12,
  },
  botaoDesativado: {
    opacity: 0.4,
  },
  painelIngresso: {
    backgroundColor: '#111c2e',
    borderWidth: 1,
    borderColor: '#263449',
    borderRadius: 13,
    padding: 18,
    marginBottom: 25,
  },
  resultadoIngresso: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#080d18',
    borderRadius: 10,
  },
  resultadoTitulo: {
    color: '#06b6d4',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultadoTexto: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 9,
    lineHeight: 18,
  },
  statusIngresso: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  statusDisponivel: {
    backgroundColor: '#166534',
  },
  statusUtilizado: {
    backgroundColor: '#991b1b',
  },
  statusIngressoTexto: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});