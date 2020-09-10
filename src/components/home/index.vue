<template>
    <div id="homepage" class="main-body">
    </div>
</template>
<script>
    import { wrapComponent } from 'inject';

    export default wrapComponent({
        components: {
        },
        data() {
            return {
            };
        },
        computed: {
            $$contextName() {
                return 'home-page';
            },
        },
        methods: {

        },
        // mounted() {
            
        // },
        // beforeRouteEnter(to, from, next) {
        //     next((vm) => {});
        // },
        // beforeRouteUpdate(to, from, next) {
        //     next();
        // },
        // beforeRouteLeave(to, from, next) {
        //     next();
        // },
    });
</script>
<style lang="scss">
    @import 'style/mixin';

    #homepage {
        width: 100%;
        height: 100vh;
        min-height: 100vh;
        overflow: hidden;
        background: $bgc_sub;
        display: flex;
        flex-direction: column;
    }
</style>