<?php

namespace App\Agenda\Services;

use App\Agenda\Entities\Cita;
use App\Agenda\Entities\EstadoCita;
use App\Agenda\Entities\Cliente;
use App\Agenda\Repositories\CitaRepository;
use App\Agenda\Repositories\ClienteRepository;
use App\Agenda\Repositories\ServicioRepository;
use DateTime;
use Exception;

/**
 * AgendaService - Servicio principal para los casos de uso del módulo de Agenda.
 */
class AgendaService
{
  private string $adminWhatsapp;

  public function __construct(
    private CitaRepository $citaRepo = new CitaRepository(),
    private ClienteRepository $clienteRepo = new ClienteRepository(),
    private ServicioRepository $servicioRepo = new ServicioRepository(),
    private DisponibilidadService $disponibilidadService = new DisponibilidadService(),
    ?string $adminWhatsapp = null
  ) {
    // Celular del administrador para recibir las solicitudes iniciales de WhatsApp
    if ($adminWhatsapp !== null) {
      $this->adminWhatsapp = $adminWhatsapp;
    } elseif (defined('ADMIN_WHATSAPP')) {
      $this->adminWhatsapp = (string) ADMIN_WHATSAPP;
    } else {
      $this->adminWhatsapp = '523121064455'; // Default configurable
    }
  }

  /**
   * Busca si un cliente ya existe por su teléfono para precargar sus datos.
   */
  public function consultarClientePorTelefono(string $telefono): ?array
  {
    $cliente = $this->clienteRepo->buscarPorTelefono($telefono);
    if (!$cliente) {
      return null;
    }

    return [
      'id' => $cliente->getId(),
      'nombre_completo' => $cliente->getNombreCompleto(),
      'telefono' => $this->clienteRepo->descifrarTelefono($cliente)
    ];
  }

  /**
   * Caso de Uso: Agendar una nueva cita (Estado: Pendiente)
   * Valida disponibilidad, asocia o registra al cliente y genera el link de WhatsApp para el Admin.
   *
   * @throws Exception
   */
  public function agendarCita(
    string $nombreCompleto,
    string $telefono,
    int $servicioId,
    string $fechaCita,
    string $horaInicio,
    ?string $notasCliente = null
  ): array {
    $servicio = $this->servicioRepo->buscarPorId($servicioId);
    if (!$servicio || !$servicio->isActivo()) {
      throw new Exception("El servicio seleccionado no es válido o no está activo.");
    }

    // Calcular hora de fin según la duración del servicio
    $inicioObj = new DateTime("{$fechaCita} {$horaInicio}");
    $finObj = (clone $inicioObj)->modify("+{$servicio->getDuracionMinutos()} minutes");
    $horaFin = $finObj->format('H:i:s');
    $horaInicioNorm = $inicioObj->format('H:i:s');

    // 1. Validar que no exista conflicto de horario
    if ($this->citaRepo->existeConflictoHorario($fechaCita, $horaInicioNorm, $horaFin)) {
      throw new Exception("Lo sentimos, el horario {$horaInicio} para el día {$fechaCita} ya no se encuentra disponible.");
    }

    // 2. Buscar o registrar cliente evitando duplicados
    $cliente = $this->clienteRepo->buscarPorTelefono($telefono);
    if (!$cliente) {
      $cliente = $this->clienteRepo->registrar($nombreCompleto, $telefono);
    } else {
      // Si el cliente ya existe pero actualizó su nombre, lo guardamos
      if (trim($nombreCompleto) !== '' && $nombreCompleto !== $cliente->getNombreCompleto()) {
        $this->clienteRepo->actualizar($cliente->getId(), $nombreCompleto);
        $cliente->setNombreCompleto($nombreCompleto);
      }
    }

    // 3. Crear entidad de Cita
    $codigoCita = CitaRepository::generarCodigo();
    $cita = new Cita(
      codigoCita: $codigoCita,
      clienteId: $cliente->getId(),
      servicioId: $servicio->getId(),
      fechaCita: $fechaCita,
      horaInicio: $horaInicioNorm,
      horaFin: $horaFin,
      estado: EstadoCita::PENDIENTE,
      notasCliente: $notasCliente
    );

    $citaId = $this->citaRepo->crear($cita);
    $cita->setId($citaId);

    // 4. Generar mensaje precargado de WhatsApp para el Administrador
    $mensajeWhatsapp = $this->generarMensajeSolicitudAdmin(
      nombre: $nombreCompleto,
      telefono: $telefono,
      servicioNombre: $servicio->getNombre(),
      fecha: $fechaCita,
      horaInicio: $inicioObj->format('H:i'),
      horaFin: $finObj->format('H:i'),
      codigoCita: $codigoCita,
      notas: $notasCliente
    );

    $whatsappUrl = $this->crearEnlaceWhatsapp($this->adminWhatsapp, $mensajeWhatsapp);

    return [
      'exito' => true,
      'cita_id' => $citaId,
      'codigo_cita' => $codigoCita,
      'estado' => $cita->getEstado()->value,
      'cliente' => [
        'id' => $cliente->getId(),
        'nombre' => $cliente->getNombreCompleto()
      ],
      'servicio' => [
        'id' => $servicio->getId(),
        'nombre' => $servicio->getNombre(),
        'duracion_minutos' => $servicio->getDuracionMinutos()
      ],
      'fecha_cita' => $fechaCita,
      'hora_inicio' => $inicioObj->format('H:i'),
      'hora_fin' => $finObj->format('H:i'),
      'mensaje_whatsapp' => $mensajeWhatsapp,
      'whatsapp_url' => $whatsappUrl
    ];
  }

  /**
   * Caso de Uso: Administrador confirma la cita.
   * Cambia el estado a Confirmada y genera el link de WhatsApp con el mensaje para el Cliente.
   *
   * @throws Exception
   */
  public function confirmarCita(int $citaId, ?string $mensajeAdmin = null): array
  {
    $cita = $this->citaRepo->buscarPorId($citaId);
    if (!$cita) {
      throw new Exception("La cita solicitada no existe.");
    }

    $cliente = $this->clienteRepo->buscarPorId($cita->getClienteId());
    $servicio = $this->servicioRepo->buscarPorId($cita->getServicioId());

    $this->citaRepo->cambiarEstado($citaId, EstadoCita::CONFIRMADA, $mensajeAdmin);
    $cita->confirmar($mensajeAdmin);

    $telefonoCliente = $this->clienteRepo->descifrarTelefono($cliente);

    $mensajeConfirmacion = $this->generarMensajeConfirmacionCliente(
      nombre: $cliente->getNombreCompleto(),
      servicioNombre: $servicio->getNombre(),
      fecha: $cita->getFechaCita(),
      horaInicio: substr($cita->getHoraInicio(), 0, 5),
      codigoCita: $cita->getCodigoCita(),
      mensajeExtra: $mensajeAdmin
    );

    $whatsappUrl = $this->crearEnlaceWhatsapp($telefonoCliente, $mensajeConfirmacion);

    return [
      'exito' => true,
      'cita_id' => $citaId,
      'codigo_cita' => $cita->getCodigoCita(),
      'estado' => EstadoCita::CONFIRMADA->value,
      'cliente_nombre' => $cliente->getNombreCompleto(),
      'cliente_telefono' => $telefonoCliente,
      'mensaje_whatsapp' => $mensajeConfirmacion,
      'whatsapp_url' => $whatsappUrl
    ];
  }

  /**
   * Caso de Uso: Administrador cancela o rechaza una cita con motivo opcional.
   */
  public function cancelarCita(int $citaId, ?string $motivo = null): array
  {
    $cita = $this->citaRepo->buscarPorId($citaId);
    if (!$cita) {
      throw new Exception("La cita no existe.");
    }

    $cliente = $this->clienteRepo->buscarPorId($cita->getClienteId());
    $servicio = $this->servicioRepo->buscarPorId($cita->getServicioId());

    $this->citaRepo->cambiarEstado($citaId, EstadoCita::CANCELADA, $motivo);

    $telefonoCliente = $this->clienteRepo->descifrarTelefono($cliente);

    $mensajeCancelacion = "Hola {$cliente->getNombreCompleto()}, te informamos que tu cita con código *{$cita->getCodigoCita()}* para el servicio *{$servicio->getNombre()}* el día *{$cita->getFechaCita()}* ha sido cancelada.";
    if ($motivo !== null && trim($motivo) !== '') {
      $mensajeCancelacion .= "\n\n*Motivo:* {$motivo}";
    }

    $whatsappUrl = $this->crearEnlaceWhatsapp($telefonoCliente, $mensajeCancelacion);

    return [
      'exito' => true,
      'cita_id' => $citaId,
      'estado' => EstadoCita::CANCELADA->value,
      'mensaje_whatsapp' => $mensajeCancelacion,
      'whatsapp_url' => $whatsappUrl
    ];
  }

  /**
   * Caso de Uso: Actualizar horario o fecha de una cita existente.
   */
  public function actualizarCita(
    int $citaId,
    string $nuevaFecha,
    string $nuevaHoraInicio,
    ?int $nuevoServicioId = null,
    ?string $motivo = null
  ): array {
    $cita = $this->citaRepo->buscarPorId($citaId);
    if (!$cita) {
      throw new Exception("La cita no existe.");
    }

    $servicioId = $nuevoServicioId ?? $cita->getServicioId();
    $servicio = $this->servicioRepo->buscarPorId($servicioId);

    $inicioObj = new DateTime("{$nuevaFecha} {$nuevaHoraInicio}");
    $finObj = (clone $inicioObj)->modify("+{$servicio->getDuracionMinutos()} minutes");

    $horaInicioNorm = $inicioObj->format('H:i:s');
    $horaFinNorm = $finObj->format('H:i:s');

    // Validar conflicto excluyendo la cita actual
    if ($this->citaRepo->existeConflictoHorario($nuevaFecha, $horaInicioNorm, $horaFinNorm, $citaId)) {
      throw new Exception("El horario seleccionado para el día {$nuevaFecha} no está disponible.");
    }

    $cita->setFechaCita($nuevaFecha);
    $cita->setHoraInicio($horaInicioNorm);
    $cita->setHoraFin($horaFinNorm);
    $cita->setServicioId($servicioId);
    if ($motivo !== null) {
      $cita->setNotasAdmin($motivo);
    }

    $this->citaRepo->actualizar($cita);

    $cliente = $this->clienteRepo->buscarPorId($cita->getClienteId());
    $telefonoCliente = $this->clienteRepo->descifrarTelefono($cliente);

    $mensajeActualizacion = "Hola {$cliente->getNombreCompleto()}, tu cita con código *{$cita->getCodigoCita()}* ha sido reprogramada para el día *{$nuevaFecha}* a las *{$inicioObj->format('H:i')} hrs*.";
    if ($motivo !== null && trim($motivo) !== '') {
      $mensajeActualizacion .= "\n\n*Nota:* {$motivo}";
    }

    $whatsappUrl = $this->crearEnlaceWhatsapp($telefonoCliente, $mensajeActualizacion);

    return [
      'exito' => true,
      'cita_id' => $citaId,
      'fecha_cita' => $nuevaFecha,
      'hora_inicio' => $inicioObj->format('H:i'),
      'mensaje_whatsapp' => $mensajeActualizacion,
      'whatsapp_url' => $whatsappUrl
    ];
  }

  // --- Generadores de Mensajes y URLs de WhatsApp ---

  private function generarMensajeSolicitudAdmin(
    string $nombre,
    string $telefono,
    string $servicioNombre,
    string $fecha,
    string $horaInicio,
    string $horaFin,
    string $codigoCita,
    ?string $notas = null
  ): string {
    $msg = "🌿 *Solicitud de Cita - Casa Nei*\n\n";
    $msg .= "• *Código:* {$codigoCita}\n";
    $msg .= "• *Paciente:* {$nombre}\n";
    $msg .= "• *Teléfono:* {$telefono}\n";
    $msg .= "• *Servicio:* {$servicioNombre}\n";
    $msg .= "• *Fecha:* {$fecha}\n";
    $msg .= "• *Horario:* {$horaInicio} - {$horaFin}\n";

    if ($notas !== null && trim($notas) !== '') {
      $msg .= "• *Notas:* {$notas}\n";
    }

    return $msg;
  }

  private function generarMensajeConfirmacionCliente(
    string $nombre,
    string $servicioNombre,
    string $fecha,
    string $horaInicio,
    string $codigoCita,
    ?string $mensajeExtra = null
  ): string {
    $msg = "🌿 *¡Tu cita en Casa Nei ha sido Confirmada!*\n\n";
    $msg .= "Hola *{$nombre}*, te esperamos con gusto:\n\n";
    $msg .= "• *Código:* {$codigoCita}\n";
    $msg .= "• *Servicio:* {$servicioNombre}\n";
    $msg .= "• *Fecha:* {$fecha}\n";
    $msg .= "• *Hora:* {$horaInicio} hrs\n";

    if ($mensajeExtra !== null && trim($mensajeExtra) !== '') {
      $msg .= "\n📝 *Indicaciones:* {$mensajeExtra}\n";
    }

    $msg .= "\nSi necesitas cualquier cambio, por favor avísanos con anticipación.";
    return $msg;
  }

  private function crearEnlaceWhatsapp(string $telefono, string $texto): string
  {
    $telefonoLimpio = preg_replace('/[^\d]/', '', $telefono);
    $textoEncoded = rawurlencode($texto);
    return "https://wa.me/{$telefonoLimpio}?text={$textoEncoded}";
  }
}
