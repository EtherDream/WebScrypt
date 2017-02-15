package {
    import flash.display.Sprite;
    import com.etherdream.webworker.WebWorker;
    
    
    public class Scrypt extends Sprite {
        
        public function Scrypt() {
            if (WebWorker.isMainThread()) {
                new Main(loaderInfo.bytes);
            } else {
                new Child();
            }
        }
    }
}
