<?php
namespace App\Agenda\Services;

class WhatsAppService
{
    /**
     * Genera el texto del mensaje precargado de WhatsApp para enviar al Administrador.
     */
    public function generarMensajeSolicitudAdmin(
        string $nombre,
        string $telefono,
        string $servicioNombre,
        string $fecha,
        string $horaInicio,
        string $horaFin,
        string $codigoCita,
        ?string $notas = null
    ): string {
        $horarioFormato = DisponibilidadService::formatearHoraAmPm($horaInicio) . ' - ' . DisponibilidadService::formatearHoraAmPm($horaFin);

        $msg = "*Solicitud de Cita - Casa Nei*\n\n";
        $msg .= "• *Código:* {$codigoCita}\n";
        $msg .= "• *Paciente:* {$nombre}\n";
        if (!empty($telefono)) {
            $msg .= "• *Teléfono:* {$telefono}\n";
        }
        $msg .= "• *Servicio:* {$servicioNombre}\n";
        $msg .= "• *Fecha:* {$fecha}\n";
        $msg .= "• *Horario:* {$horarioFormato}\n";

        if ($notas !== null && trim($notas) !== '') {
            $msg .= "• *Notas:* {$notas}\n";
        }

        return $msg;
    }

    /**
     * Genera el mensaje precargado de WhatsApp con los datos de confirmación para el paciente.
     */
    public function generarMensajeConfirmacionCliente(
        string $nombre,
        string $servicioNombre,
        string $fecha,
        string $horaInicio,
        string $codigoCita,
        ?string $mensajeExtra = null
    ): string {
        $horaFormato = DisponibilidadService::formatearHoraAmPm($horaInicio);

        $msg = "*¡Tu cita en Casa Nei ha sido Confirmada!*\n\n";
        $msg .= "Hola *{$nombre}*, te esperamos con gusto:\n\n";
        $msg .= "• *Código:* {$codigoCita}\n";
        $msg .= "• *Servicio:* {$servicioNombre}\n";
        $msg .= "• *Fecha:* {$fecha}\n";
        $msg .= "• *Hora:* {$horaFormato}\n";

        if ($mensajeExtra !== null && trim($mensajeExtra) !== '') {
            $msg .= "\n• *Indicaciones:* {$mensajeExtra}\n";
        }

        $msg .= "\nSi necesitas cualquier cambio, por favor avísanos con anticipación.";
        return $msg;
    }
    
    /**
     * Genera un mensaje de cancelación para el cliente.
     */
    public function generarMensajeCancelacionCliente(
        string $nombre,
        string $servicioNombre,
        string $fecha,
        string $horaInicio,
        string $codigoCita,
        ?string $motivo = null
    ): string {
        $horaFormato = DisponibilidadService::formatearHoraAmPm($horaInicio);
        $msg = "Hola {$nombre}, te informamos que tu cita con código *{$codigoCita}* para el servicio *{$servicioNombre}* el día *{$fecha}* a las *{$horaFormato}* ha sido cancelada.";
        if ($motivo !== null && trim($motivo) !== '') {
            $msg .= "\n\n*Motivo:* {$motivo}";
        }
        return $msg;
    }
    
    /**
     * Genera un mensaje de reprogramación para el cliente.
     */
    public function generarMensajeReprogramacionCliente(
        string $nombre,
        string $fecha,
        string $horaInicio,
        string $codigoCita,
        ?string $motivo = null
    ): string {
        $horaFormato = DisponibilidadService::formatearHoraAmPm($horaInicio);
        $msg = "Hola {$nombre}, tu cita con código *{$codigoCita}* ha sido reprogramada para el día *{$fecha}* a las *{$horaFormato}*.";
        if ($motivo !== null && trim($motivo) !== '') {
            $msg .= "\n\n*Nota:* {$motivo}";
        }
        return $msg;
    }

    /**
     * Construye un enlace oficial de WhatsApp (wa.me) codificando el mensaje en UTF-8 seguro.
     */
    public function crearEnlaceWhatsapp(string $telefono, string $texto): string
    {
        $telefonoLimpio = preg_replace('/[^\d]/', '', $telefono);
        $textoEncoded = rawurlencode($texto);
        return "https://wa.me/{$telefonoLimpio}?text={$textoEncoded}";
    }
}
