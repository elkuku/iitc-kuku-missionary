export class Notification {

    private timer: number | undefined = undefined

    show = (text: string, persistent = false): void => {
        const $notification = $('.umm-notification')
        $notification.hide()
        $notification.text(text)
        $notification.html($notification.html().replace(/\n/g, '<br/>'))
        $notification.show()

        if (this.timer !== undefined) {
            window.clearTimeout(this.timer)
            this.timer = undefined
        }

        if (!persistent) {
            this.timer = window.setTimeout(() => {
                $notification.fadeOut(400)
            }, 3000)
        }
    }
}
