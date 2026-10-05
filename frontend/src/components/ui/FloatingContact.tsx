"use client";

import React from "react";

export default function FloatingContact() {
  return (
    <div className="floating-contact" aria-label="Quick Contact Channels">
      {/* 1. Hotline Button */}
      <a
        href="tel:0367535688"
        className="floating-btn btn-phone"
        title="Gọi Hotline tư vấn"
      >
        <span className="tooltip-text">Hotline: 0367.535.688</span>
        <div className="pulse-ring"></div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.122-4.1-6.924-6.924l1.293-.97a1.125 1.125 0 00.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
          />
        </svg>
      </a>

      {/* 2. Facebook Button */}
      <a
        href="https://facebook.com/newstartour.vn"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-btn btn-facebook"
        title="Truy cập Facebook"
      >
        <span className="tooltip-text">Facebook Fanpage</span>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="icon"
        >
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z" />
        </svg>
      </a>

      {/* 3. Messenger Button */}
      <a
        href="https://m.me/newstartour"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-btn btn-messenger"
        title="Chat qua Messenger"
      >
        <span className="tooltip-text">Messenger</span>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="icon"
        >
          <path d="M12 2.04c-5.5 0-10 4.25-10 9.5 0 2.99 1.48 5.66 3.79 7.37v3.66c0 .35.39.58.71.42l4.1-2.25c.46.12.94.2 1.4.2 5.5 0 10-4.25 10-9.5s-4.5-9.5-10-9.5zm1.09 12.35l-2.61-2.79-5.1 2.79 5.61-5.96 2.61 2.79 5.1-2.79-5.61 5.96z" />
        </svg>
      </a>

      {/* 4. Zalo Button */}
      <a
        href="https://zalo.me/0367535688"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-btn btn-zalo"
        title="Chat qua Zalo"
      >
        <span className="tooltip-text">Chat Zalo</span>
        <svg
          viewBox="0 0 48 48"
          className="icon-zalo-custom"
          style={{ width: "38px", height: "38px" }}
        >
          <path fill="#2962ff" d="M15,36V6.827l-1.211-0.811C8.64,8.083,5,13.112,5,19v10c0,7.732,6.268,14,14,14h10	c4.722,0,8.883-2.348,11.417-5.931V36H15z" />
          <path fill="#eee" d="M29,5H19c-1.845,0-3.601,0.366-5.214,1.014C10.453,9.25,8,14.528,8,19	c0,6.771,0.936,10.735,3.712,14.607c0.216,0.301,0.357,0.653,0.376,1.022c0.043,0.835-0.129,2.365-1.634,3.742	c-0.162,0.148-0.059,0.419,0.16,0.428c0.942,0.041,2.843-0.014,4.797-0.877c0.557-0.246,1.191-0.203,1.729,0.083	C20.453,39.764,24.333,40,28,40c4.676,0,9.339-1.04,12.417-2.916C42.038,34.799,43,32.014,43,29V19C43,11.268,36.732,5,29,5z" />
          <path fill="#2962ff" d="M36.75,27C34.683,27,33,25.317,33,23.25s1.683-3.75,3.75-3.75s3.75,1.683,3.75,3.75	S38.817,27,36.75,27z M36.75,21c-1.24,0-2.25,1.01-2.25,2.25s1.01,2.25,2.25,2.25S39,24.49,39,23.25S37.99,21,36.75,21z" />
          <path fill="#2962ff" d="M31.5,27h-1c-0.276,0-0.5-0.224-0.5-0.5V18h1.5V27z" />
          <path fill="#2962ff" d="M27,19.75v0.519c-0.629-0.476-1.403-0.769-2.25-0.769c-2.067,0-3.75,1.683-3.75,3.75	S22.683,27,24.75,27c0.847,0,1.621-0.293,2.25-0.769V26.5c0,0.276,0.224,0.5,0.5,0.5h1v-7.25H27z M24.75,25.5	c-1.24,0-2.25-1.01-2.25-2.25S23.51,21,24.75,21S27,22.01,27,23.25S25.99,25.5,24.75,25.5z" />
          <path fill="#2962ff" d="M21.25,18h-8v1.5h5.321L13,26h0.026c-0.163,0.211-0.276,0.463-0.276,0.75V27h7.5	c0.276,0,0.5-0.224,0.5-0.5v-1h-5.321L21,19h-0.026c0.163-0.211,0.276-0.463,0.276-0.75V18z" />
        </svg>

      </a>
    </div>
  );
}
