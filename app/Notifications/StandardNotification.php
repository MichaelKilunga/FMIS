<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StandardNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $title,
        public string $content,
        public array $action = [], // e.g., ['url' => '...', 'label' => '...']
        public string $type = 'info', // info, success, warning, error
        public array $metadata = []
    ) {}

    /**
     * Get the notification's delivery channels.
     * Channels are determined dynamically by the NotificationService.
     */
    public function via(object $notifiable): array
    {
        // By default, we use database. Other channels are determined before sending, or via service logic.
        // If we want dynamic channels based on user preferences here:
        // We'll pass the exact channels in the NotificationService using \Notification::send($users, new StandardNotification(...))->via(['mail', 'database']);
        // But the via() method inside the Notification class must return an array, so we check if the service passed specific channels via a property, or just default to database.
        
        $channels = ['database'];
        
        // Example: If notifiable has a specific preference, but usually NotificationService handles this by routing appropriately.
        if (isset($this->metadata['channels']) && is_array($this->metadata['channels'])) {
            $channels = $this->metadata['channels'];
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
                    ->subject($this->title)
                    ->line($this->content);

        if (!empty($this->action) && isset($this->action['url'], $this->action['label'])) {
            $message->action($this->action['label'], $this->action['url']);
        }

        return $message;
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'content' => $this->content,
            'action' => $this->action,
            'type' => $this->type,
            'metadata' => $this->metadata,
        ];
    }
}
