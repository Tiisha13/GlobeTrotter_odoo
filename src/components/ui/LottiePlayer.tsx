import { useEffect, useState } from "react";
import Lottie from "lottie-react";

type LottiePlayerProps = {
  url: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
};

// Lightweight wrapper that fetches a Lottie JSON from a URL.
const LottiePlayer = ({ url, className, loop = true, autoplay = true }: LottiePlayerProps) => {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (isMounted) setData(json);
      })
      .catch(() => {
        /* ignore errors in demo */
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!data) return null;
  return <Lottie animationData={data} className={className} loop={loop} autoplay={autoplay} />;
};

export default LottiePlayer;


