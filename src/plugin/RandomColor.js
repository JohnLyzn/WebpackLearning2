export default class RandomColor {

    constructor(seed = -1) {
        this.colorArr = [];
        this.counter = 0;
        this.refresh(seed);
    };

    get() {
        if(! this.colorArr.length) {
            return '#ccc';
        }
        // return '#' + ('00000' + (Math.random() * 0x1000000 << 0).toString(16)).substr(-6);
        // const letters = Math.abs(Utils.hashCode(this.text || this.icon)) + '';
        // console.log(letters);
        // let color = '#';
        // for (let i = 0; i < 6; i ++) {
        //     color += letters[i > letters.length ? 5 : i];
        // }
        // return color;
        return this.colorArr[this.counter ++ % this.colorArr.length];
    };

    refresh(seed) {
        this.seed = seed;
        this._generateColorArr();
    };

    _hsvtorgb(h, s, v) { //hsv转rgb
        let h_i = parseInt(h * 6);
        let f = h * 6 - h_i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);
        let r, g, b;
        switch (h_i) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3 :
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            case 5:
                r = v;
                g = p;
                b = q;
                break;
            default:
                r = 1;
                g = 1;
                b = 1;
        }
        return 'rgb('+parseInt(r*255) + ',' + parseInt(g*255) + ',' + parseInt(b*255)+')'
    };

    _generateColorArr() { //h和s值固定，随机生成v
        this.colorArr = [];
        let golden_ratio = 0.618033988749895;
        let s = 0.5;
        let v = 0.999;
        for(let i = 0; i < 10; i ++){
            let h = golden_ratio + this._seededRandom(-0.5, 0.3);
            let color = this._hsvtorgb(h,s,v);
            this.colorArr.push(color)
        }
    };

    _seededRandom(max, min) {
        max = max || 1;
        min = min || 0;
        this.seed = (this.seed * 9301 + 49297) % 233280;
        let rnd = this.seed / 233280.0;
        return min + rnd * (max - min);
    };
}
